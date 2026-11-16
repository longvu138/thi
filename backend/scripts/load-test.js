require('dotenv').config({quiet:true});
const {randomUUID}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {parseOptions,assertTrial,summarize,virtualSchedule,acceptance}=require('./load-test.logic');
const run=async options=>{
 // Never mutate backend/.env. Only this isolated runner connects to the explicit test DB.
 process.env.DB_NAME=options.database;
 const db=require('../src/config/database');const metrics=new Map(),httpErrors={},errors={},users=new Set();
 let completed=0,requests=0,failures=0,duplicateStarts=0;const runId=randomUUID().slice(0,8),epoch=performance.now();
 const until=async target=>{const ms=target-performance.now();if(ms>0)await new Promise(r=>setTimeout(r,ms));};
 const request=async(method,path,body,session,ip)=>{
  const key=`${method} ${path.replace(/[0-9a-f-]{36}/g,':id')}`,started=performance.now();requests++;
  try{
   const response=await fetch(options.baseUrl+path,{method,signal:AbortSignal.timeout(path.endsWith('/submit')?60000:30000),headers:{'Content-Type':'application/json','X-Load-Test-Database':options.database,'X-Load-Test-IP':ip,...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'API thất bại'),{status:response.status});
   return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }catch(error){failures++;const code=String(error.status||error.name);httpErrors[code]=(httpErrors[code]||0)+1;throw error;}
  finally{if(!metrics.has(key))metrics.set(key,[]);metrics.get(key).push(performance.now()-started);}
 };
 try{
  const check=await fetch(options.baseUrl+'/health',{headers:{'X-Load-Test-Database':options.database},signal:AbortSignal.timeout(5000)});
  if(!check.ok||check.headers.get('X-Load-Test-Database')!==options.database)throw new Error('API chưa bật LOAD_TEST_ENABLED hoặc không trỏ cùng database test; chưa tạo dữ liệu');
  const round=await db('exam_rounds').where({id:options.roundId}).first();assertTrial(round);
  if(Date.now()+options.durationSeconds*1000+60000>=new Date(round.start_at).getTime())throw new Error('Cửa sổ chạy thử không đủ dài cho kịch bản tải');
  if(Number(round.duration_minutes)*60000<options.durationSeconds*1000+60000)throw new Error('Thời lượng lượt thử quá ngắn cho kịch bản tải');
  const worker=async index=>{
   const plan=virtualSchedule(index,options);await until(epoch+plan.enterAt);
   try{
    assertTrial(await db('exam_rounds').where({id:options.roundId}).first());
    const entered=await request('POST','/auth/enter',{fullName:`E2E_LOAD_${runId}_${index}`,partyCommittee:'E2E Đảng bộ tải thử',partyBranch:`E2E_LOAD_${runId}`},null,plan.ip);
    const session={cookie:entered.cookie,csrf:entered.data.csrfToken},userId=entered.data.user.id;
    if(!await db('users').where({id:userId}).first('id'))throw new Error('API không trỏ cùng database test');users.add(userId);
    const starts=await Promise.all([request('POST',`/exam-rounds/${options.roundId}/start`,{trialOnly:true},session,plan.ip),request('POST',`/exam-rounds/${options.roundId}/start`,{trialOnly:true},session,plan.ip)]);
    const attempt=starts[0].data;if(!attempt.isTrial)throw new Error('Lượt không phải chạy thử');
    if(starts[1].data.id!==attempt.id)duplicateStarts++;
    const active=await db('attempts').where({user_id:userId,exam_round_id:options.roundId,status:'IN_PROGRESS'}).count({n:'id'}).first();if(Number(active.n)>1)duplicateStarts++;
    const selected=new Map(),pending=new Map();let cursor=0,next=performance.now()+options.batchSeconds*1000;
    while(next<epoch+plan.submitAt){
     await until(next);assertTrial(await db('exam_rounds').where({id:options.roundId}).first());
     const changed=[];for(let n=0;n<Math.max(1,Math.floor(options.batchSeconds/5));n++){
      const q=attempt.questions[cursor++%attempt.questions.length];const answer=q.options[Math.floor(cursor/attempt.questions.length)%q.options.length].key;
      selected.set(q.id,answer);changed.push({attemptQuestionId:q.id,selectedAnswer:answer});
     }
     // Full pending map retries failed batches on the following tick, like the client.
     for(const a of changed)pending.set(a.attemptQuestionId,a);
     const batch=[...pending.values()];
     const results=await Promise.allSettled([request('PUT',`/attempts/${attempt.id}/answers`,{answers:batch},session,plan.ip),request('GET',`/attempts/${attempt.id}`,undefined,session,plan.ip)]);
     if(results[0].status==='fulfilled')pending.clear();
     next+=options.batchSeconds*1000;
    }
    await until(epoch+plan.submitAt);
    await request('POST',`/attempts/${attempt.id}/submit`,{answers:attempt.questions.map(q=>({attemptQuestionId:q.id,selectedAnswer:selected.get(q.id)??null}))},session,plan.ip);completed++;
   }catch(error){const type=String(error.status||error.message||error.name);errors[type]=(errors[type]||0)+1;}
  };
  // Separate user/session for every virtual person; optional cap for small local machines.
  let index=0;await Promise.all(Array.from({length:Math.min(options.total,options.concurrency)},async()=>{while(index<options.total){const i=index++;await worker(i);}}));
  const rows=users.size?await db('attempts').where({exam_round_id:options.roundId}).whereIn('user_id',[...users]).select('user_id','status','is_trial'):[];
  const counts=new Map();for(const row of rows){const value=counts.get(row.user_id)||{total:0,active:0};value.total++;if(row.status==='IN_PROGRESS')value.active++;counts.set(row.user_id,value);}
  const excess=[...counts.values()].filter(x=>x.total>Number(round.max_attempts)).length,duplicates=duplicateStarts+[...counts.values()].filter(x=>x.active>1).length,nonTrial=rows.filter(x=>!x.is_trial).length;
  const timings=Object.fromEntries([...metrics].map(([key,values])=>[key,summarize(values)]));
  const thresholds=acceptance({requests,failures,saveP95:timings['PUT /attempts/:id/answers']?.p95Ms??Infinity,submitP95:timings['POST /attempts/:id/submit']?.p95Ms??Infinity,completed,total:options.total,excess,duplicates,nonTrial});
  const output={runId,profile:options,completed,requests,failures,httpErrors,status429:httpErrors['429']||0,status5xx:Object.entries(httpErrors).filter(([k])=>/^5\d\d$/.test(k)).reduce((sum,[,n])=>sum+n,0),errors,timings,overall:summarize([...metrics.values()].flat()),checks:{excessAttempts:excess,duplicateInProgress:duplicates,nonTrial},thresholds,cleanup:`ADMIN DELETE /api/admin/exam-rounds/${options.roundId}/trial-data; người E2E_LOAD_${runId} giữ để đối chiếu.`};
  console.log(JSON.stringify(output,null,2));if(!thresholds.pass)process.exitCode=1;return output;
 }finally{await db.destroy();}
};
if(require.main===module&&!process.env.NODE_TEST_CONTEXT)Promise.resolve().then(()=>parseOptions(process.argv.slice(2))).then(run).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={run};
