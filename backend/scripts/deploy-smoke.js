// Chỉ chạy thủ công trong stack Compose QA riêng; xem docs/VAN_HANH.md.
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const db=require('../src/config/database'),{createAdmin}=require('./create-admin');
const base='http://web/api';const run=async()=>{
 assert.match(process.env.DB_NAME||'',/^exam_load_test_[a-z0-9_]+$/);
 assert.equal(process.env.LOAD_TEST_ENABLED,'true');assert.notEqual(process.env.NODE_ENV,'production');
 const handshake=await fetch(base+'/health',{headers:{'X-Load-Test-Database':process.env.DB_NAME}});
 assert.equal(handshake.headers.get('X-Load-Test-Database'),process.env.DB_NAME,'API phải trỏ cùng database QA trước khi tạo admin');
 const password=randomBytes(24).toString('hex'),username='e2e_s13_'+Date.now();await createAdmin({username,fullName:'E2E Admin triển khai',password},{force:true});
 async function call(method,path,body,session,expected=200){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();assert.equal(r.status,expected,`${path}: ${text}`);return {data:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const login=await call('POST','/auth/login',{username,password});const admin={cookie:login.cookie,csrf:login.data.csrfToken};
 const entered=await call('POST','/auth/enter',{fullName:'E2E Người thử triển khai '+Date.now(),partyCommittee:'E2E Đảng bộ',partyBranch:'E2E Chi bộ'});const user={cookie:entered.cookie,csrf:entered.data.csrfToken};
 const makeRound=async trial=>{
  const now=Date.now();const round=(await call('POST','/admin/exam-rounds',{title:'E2E_ROUND_Stage13_'+(trial?'load':'official')+'_'+now,durationMinutes:30,maxAttempts:1,startAt:new Date(now+(trial?3600000:-60000)).toISOString(),endAt:new Date(now+7200000).toISOString(),...(trial?{trialStartAt:new Date(now-60000).toISOString()}:{})},admin,201)).data;
  for(let i=0;i<10;i++)await call('POST',`/admin/exam-rounds/${round.id}/questions`,{questionCode:'E2E_'+i,category:'E2E Nghị quyết '+Math.floor(i/5),content:'E2E Câu hỏi '+i,optionA:'Đúng',optionB:'Sai',optionC:'Khác',correctAnswer:'A'},admin,201);
  await call('PUT',`/admin/exam-rounds/${round.id}/structure`,{mode:'RANDOM',count:10},admin);
  await call('PATCH',`/admin/exam-rounds/${round.id}`,{status:'OPEN'},admin);return round.id;
 };
 const roundId=await makeRound(false);const attempt=(await call('POST',`/exam-rounds/${roundId}/start`,{},user,201)).data;
 assert.equal(attempt.status,'IN_PROGRESS');assert.equal(attempt.isTrial,false);assert.ok(attempt.questions.every(q=>!Object.hasOwn(q,'correctAnswer')));
 const answers=attempt.questions.map(q=>({attemptQuestionId:q.id,selectedAnswer:'A'}));await call('PUT',`/attempts/${attempt.id}/answers`,{answers:answers.slice(0,2)},user);
 const submitted=(await call('POST',`/attempts/${attempt.id}/submit`,{answers},user)).data;assert.equal(submitted.status,'SUBMITTED');
 const again=(await call('POST',`/attempts/${attempt.id}/submit`,{answers:answers.map(a=>({...a,selectedAnswer:null}))},user)).data;assert.equal(again.percentage,submitted.percentage);
 const result=(await call('GET',`/attempts/${attempt.id}/result`,undefined,user)).data;assert.equal(result.receiptCode,submitted.receiptCode);
 await call('GET',`/attempts/${attempt.id}/receipt`,undefined,user);
 await call('POST',`/exam-rounds/${roundId}/start`,{},user,409);
 const loadRoundId=await makeRound(true);require('node:fs').writeFileSync('/tmp/stage13-fixture.json',JSON.stringify({loadRoundId,roundId,attemptId:attempt.id}));
 console.log(JSON.stringify({status:'PASS',adminCreated:true,officialAttempt:'start/save/submit/result/receipt/idempotent/limit PASS',loadRoundId}));
};run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.destroy());
