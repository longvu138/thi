const parseOptions=(argv,env=process.env)=>{
 const args={};const allowed=['--round-id','--total','--concurrency','--base-url','--ramp-seconds','--duration-seconds','--submit-window-seconds','--batch-seconds'];
 for(let i=0;i<argv.length;i+=2){if(!allowed.includes(argv[i])||!argv[i+1]||args[argv[i]])throw new Error('Tham số thử tải không hợp lệ');args[argv[i]]=argv[i+1];}
 const integer=(name,fallback,max)=>{const n=Number(args[name]??fallback);if(!Number.isInteger(n)||n<1||n>max)throw new Error(`${name} phải từ 1 đến ${max}`);return n;};
 const roundId=args['--round-id'];if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(roundId||''))throw new Error('Cần --round-id UUID hợp lệ');
 const database=env.TEST_LOAD_DB_NAME;if(!/^exam_load_test_[a-z0-9_]+$/.test(database||''))throw new Error('Chỉ chạy trên TEST_LOAD_DB_NAME có tiền tố exam_load_test_');
 const url=new URL(args['--base-url']||'http://127.0.0.1:3108/api');
 if(!['http:','https:'].includes(url.protocol)||!(['127.0.0.1','localhost','[::1]'].includes(url.hostname)||(url.hostname==='web'&&env.DB_HOST==='db'&&env.LOAD_TEST_ENABLED==='true'))||url.username||url.password||url.search||url.hash)throw new Error('Chỉ thử API local, không nhận URL ngoài hoặc thông tin đăng nhập trong URL');
 const result={roundId,database,total:integer('--total',1000,10000),concurrency:integer('--concurrency',1000,1000),baseUrl:url.href.replace(/\/$/,''),rampSeconds:integer('--ramp-seconds',300,3600),durationSeconds:integer('--duration-seconds',600,7200),submitWindowSeconds:integer('--submit-window-seconds',120,3600),batchSeconds:integer('--batch-seconds',30,300)};
 if(result.durationSeconds-result.submitWindowSeconds<result.rampSeconds)throw new Error('Thời gian làm bài phải đủ giai đoạn tăng tải trước cửa sổ nộp');return result;
};
const assertTrial=(round,now=Date.now())=>{
 if(!round||!/^E2E_ROUND_/.test(round.title)||round.status!=='OPEN'||!round.trial_start_at||!round.start_at||now<new Date(round.trial_start_at).getTime()||now>=new Date(round.start_at).getTime()||(round.end_at&&now>=new Date(round.end_at).getTime()))throw new Error('Đợt đích phải là E2E_ROUND_ đang OPEN trong cửa sổ chạy thử');
};
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b);const percentile=p=>sorted.length?Number(sorted[Math.ceil(sorted.length*p)-1].toFixed(2)):0;return {count:values.length,averageMs:values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)):0,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99)};};
const virtualSchedule=(index,options)=>({ip:`198.18.${Math.floor(index/100/250)}.${Math.floor(index/100)%250+1}`,enterAt:options.rampSeconds*1000*index/Math.max(1,options.total-1),submitAt:(options.durationSeconds-options.submitWindowSeconds)*1000+options.submitWindowSeconds*1000*index/Math.max(1,options.total-1)});
const acceptance=({requests,failures,saveP95,submitP95,completed,total,excess,duplicates,nonTrial})=>({errorRate:requests?failures/requests:1,pass:requests>0&&failures/requests<.005&&saveP95<1000&&submitP95<3000&&completed===total&&excess===0&&duplicates===0&&nonTrial===0});
module.exports={parseOptions,assertTrial,summarize,virtualSchedule,acceptance};
