const test=require('node:test'),assert=require('node:assert/strict');
const {parseOptions,assertTrial,summarize}=require('./load-test.logic');
const id='11111111-1111-4111-8111-111111111111';
test('Thử tải chỉ nhận DB test, API local và giới hạn số lượng',()=>{
 const args=['--round-id',id];const env={TEST_LOAD_DB_NAME:'exam_load_test_local'};
 assert.equal(parseOptions(args,env).total,1000);
 for(const extra of [['--total','0'],['--concurrency','1001'],['--base-url','https://outside.example/api']])assert.throws(()=>parseOptions([...args,...extra],env));
 assert.throws(()=>parseOptions(args,{TEST_LOAD_DB_NAME:'exam'}));assert.throws(()=>parseOptions([],env));
});
test('Từ chối đợt chính thức, nháp, đóng, ngoài cửa sổ thử hoặc không phải E2E',()=>{
 const now=Date.parse('2026-11-12T01:00:00Z');const round={title:'E2E_ROUND_Tải',status:'OPEN',trial_start_at:new Date(now-1000),start_at:new Date(now+1000)};
 assert.doesNotThrow(()=>assertTrial(round,now));
 for(const patch of [{status:'DRAFT'},{status:'CLOSED'},{title:'Thật'},{trial_start_at:null},{start_at:new Date(now)},{trial_start_at:new Date(now+500)},{end_at:new Date(now)}])assert.throws(()=>assertTrial({...round,...patch},now));
});
test('Thời gian phản hồi báo trung bình và p95 đúng',()=>{assert.deepEqual(summarize([10,20,30,40]),{count:4,averageMs:25,p50Ms:20,p95Ms:40,p99Ms:40});assert.equal(summarize([]).p95Ms,0);});
const {validateStart}=require('../src/modules/attempts/attempts.validator');
test('Start giữ body tối thiểu, trialOnly chỉ nhận boolean và chặn trường lạ',()=>{
 assert.deepEqual(validateStart({}),{trialOnly:false});assert.deepEqual(validateStart({trialOnly:true}),{trialOnly:true});
 for(const body of [null,{trialOnly:'true'},{userId:id}])assert.throws(()=>validateStart(body),{statusCode:422});
});
const {loadTestGuard}=require('../src/middlewares/load-test-guard');
test('Handshake từ chối API thật trước khi script có thể tạo dữ liệu',()=>{
 const old={DB_NAME:process.env.DB_NAME,LOAD_TEST_ENABLED:process.env.LOAD_TEST_ENABLED,NODE_ENV:process.env.NODE_ENV};
 try{let error,header;const req={get:key=>key==='X-Load-Test-Database'?'exam_load_test_local':undefined},res={set:(_,value)=>{header=value;}};
  process.env.DB_NAME='exam';process.env.LOAD_TEST_ENABLED='true';process.env.NODE_ENV='development';loadTestGuard(req,res,e=>{error=e;});assert.equal(error.statusCode,403);
  process.env.DB_NAME='exam_load_test_local';loadTestGuard(req,res,e=>{error=e;});assert.equal(error,undefined);assert.equal(header,'exam_load_test_local');
  process.env.NODE_ENV='production';loadTestGuard(req,res,e=>{error=e;});assert.equal(error.statusCode,403);
 }finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

const {virtualSchedule,acceptance}=require('./load-test.logic');
test('1000 người tăng 5 phút, nộp 2 phút cuối, mỗi 100 người một IP',()=>{
 const options=parseOptions(['--round-id',id],{TEST_LOAD_DB_NAME:'exam_load_test_local'});
 assert.equal(virtualSchedule(0,options).enterAt,0);assert.equal(virtualSchedule(999,options).enterAt,300000);
 assert.equal(virtualSchedule(0,options).submitAt,480000);assert.equal(virtualSchedule(999,options).submitAt,600000);
 assert.equal(virtualSchedule(0,options).ip,virtualSchedule(99,options).ip);assert.notEqual(virtualSchedule(99,options).ip,virtualSchedule(100,options).ip);
 const good={requests:10000,failures:49,saveP95:999,submitP95:2999,completed:1000,total:1000,excess:0,duplicates:0,nonTrial:0};assert.equal(acceptance(good).pass,true);
 for(const patch of [{failures:50},{saveP95:1000},{submitP95:3000},{duplicates:1},{excess:1},{nonTrial:1},{completed:999}])assert.equal(acceptance({...good,...patch}).pass,false);
});
test('Chỉ mô phỏng IP khi handshake DB thử hợp lệ, không tin header thường',()=>{
 const old={...process.env};try{process.env.DB_NAME='exam_load_test_local';process.env.LOAD_TEST_ENABLED='true';process.env.NODE_ENV='development';
 let error;const req={get:key=>key==='X-Load-Test-Database'?'exam_load_test_local':key==='X-Load-Test-IP'?'198.18.0.2':undefined},res={set(){}};
 loadTestGuard(req,res,e=>{error=e;});assert.equal(error,undefined);assert.equal(req.ip,'198.18.0.2');assert.equal(req.clientInfo.ipAddress,'198.18.0.2');
 }finally{for(const k of ['DB_NAME','LOAD_TEST_ENABLED','NODE_ENV'])if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});
test('Chỉ cho phép hostname web trong mạng Docker thử tải được bật',()=>{
 const args=['--round-id',id,'--base-url','http://web/api'];
 assert.throws(()=>parseOptions(args,{TEST_LOAD_DB_NAME:'exam_load_test_local'}));
 assert.equal(parseOptions(args,{TEST_LOAD_DB_NAME:'exam_load_test_local',DB_HOST:'db',LOAD_TEST_ENABLED:'true'}).baseUrl,'http://web/api');
});
