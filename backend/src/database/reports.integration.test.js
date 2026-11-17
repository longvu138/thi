const test=require('node:test');const assert=require('node:assert/strict');
const name=process.env.TEST_REPORTS_DB_NAME;
if(name&&!/^exam_reports_test_[a-z0-9_]+$/.test(name))throw new Error('TEST_REPORTS_DB_NAME phải có tiền tố exam_reports_test_');
if(name)process.env.DB_NAME=name;
process.env.JWT_SECRET='reports-test-jwt-secret-long-value';process.env.CSRF_SECRET='reports-test-csrf-secret-long-value';process.env.AUTH_COOKIE_SECURE='false';
test('Báo cáo ADMIN: nhiều lượt một người, kết quả cuối, bộ lọc, câu xáo trộn, Excel và phân quyền',{skip:!name&&'Chưa đặt TEST_REPORTS_DB_NAME cho database test riêng',timeout:15000},async t=>{
 const db=require('../config/database');const foundation=require('./test-foundation');const identity=require('./migrations/202611110001_participant_identity');
 const users=require('../modules/users/users.service');const questions=require('../modules/questions/questions.service');const rounds=require('./test-rounds');const attempts=require('../modules/attempts/attempts.service');
 let migrated=false,server;const logger=require('../utils/logger');const originalInfo=logger.info;const audits=[];let resolveAudit;const exportAudit=new Promise(resolve=>{resolveAudit=resolve;});
 logger.info=function(payload,...args){if(payload?.event==='exam_round_report_exported'){audits.push(payload);resolveAudit();}return originalInfo.call(this,payload,...args);};
 t.after(async()=>{logger.info=originalInfo;try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}if(migrated){await require('./migrations/202611120001_attempt_receipts').down(db);await foundation.down(db);}}finally{await db.destroy();}});
 assert.equal((await db.raw('SHOW TABLES'))[0].length,0,'Chỉ dùng database test rỗng');await foundation.up(db);await require('./migrations/202611120001_attempt_receipts').up(db);migrated=true;await identity.up(db);
 const admin=await users.create({username:'e2e_report_admin',fullName:'E2E Admin',password:'123456',role:'ADMIN'});
 const user=await users.create({username:'e2e_report_one',fullName:'E2E Người một',password:'123456'});
 const other=await users.create({username:'e2e_report_two',fullName:'E2E Người hai',password:'123456'});
 await db('users').where({id:user.id}).update({party_committee:'E2E Đảng A',party_branch:'E2E Chi A'});await db('users').where({id:other.id}).update({party_committee:'E2E Đảng B',party_branch:'E2E Chi B'});
 const round=await rounds.create({title:'E2E_ROUND_Báo cáo',questionCount:2,durationMinutes:10,maxAttempts:3,shuffleOptions:true});
 const bank=[];for(let i=0;i<2;i++)bank.push(await questions.create(round.id,{questionCode:`E2E_Q_REPORT_${i}`,category:'E2E Nhóm báo cáo',content:`E2E Nội dung gốc ${i}`,optionA:'Một',optionB:'Hai',optionC:'Ba',correctAnswer:'A',allowShuffleOptions:true}));
 await rounds.update(round.id,{status:'OPEN'});
 const run=async(userId,original)=>{
  const attempt=(await attempts.start(round.id,userId)).attempt;
  if(original){const snapshots=await db('attempt_questions').where({attempt_id:attempt.id});await attempts.saveAnswers(attempt.id,userId,{answers:snapshots.map(q=>({attemptQuestionId:q.id,selectedAnswer:JSON.parse(typeof q.options_snapshot==='string'?q.options_snapshot:JSON.stringify(q.options_snapshot)).find(o=>o.originalKey===original).key}))});}
  await attempts.submit(attempt.id,userId);return attempt;
 };
 await run(user.id,'A');await run(user.id,null);await run(other.id,'B');const trial=await run(user.id,'A');await db('attempts').where({id:trial.id}).update({is_trial:1});
 // Mã/nội dung/nhóm báo cáo phải từ snapshot kể cả câu gốc sửa/xóa mềm.
 await db('questions').whereIn('id',bank.map(q=>q.id)).update({content:'E2E Đã sửa',deleted_at:db.fn.now()});
 server=require('../app/application').listen(0);const base=`http://127.0.0.1:${server.address().port}/api`;
 const call=(path,session)=>fetch(base+path,{headers:session?{Cookie:session}:{}});
 const login=async username=>{const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'123456'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 const adminCookie=await login(admin.username),userCookie=await login(user.username);const prefix=`/admin/exam-rounds/${round.id}`;
 for(const path of ['/results','/statistics','/question-statistics','/export']){
  assert.equal((await call(prefix+path)).status,401);assert.equal((await call(prefix+path,userCookie)).status,403);
  assert.equal((await call(prefix+path+'?isTrial=invalid',adminCookie)).status,422);
  assert.equal((await call('/admin/exam-rounds/11111111-1111-4111-8111-111111111111'+path,adminCookie)).status,404);
 }
 const get=async path=>{const r=await call(prefix+path,adminCookie);assert.equal(r.status,200);return r.json();};
 const stats=await get('/statistics');assert.equal(stats.participantCount,2);assert.equal(stats.attemptCount,3);assert.equal(stats.averageAttempts,1.5);assert.equal(stats.passedCount,1);assert.equal(stats.incompleteCount,1);assert.equal(stats.passRate,50);
 // Stage 17: batch summaries and most recently submitted official participant paging.
 await db('attempts').where({exam_round_id:round.id,user_id:user.id,is_trial:0}).update({submitted_at:'2026-01-01 01:00:00'});
 await db('attempts').where({exam_round_id:round.id,user_id:other.id,is_trial:0}).update({submitted_at:'2026-01-01 02:00:00'});
 await db('attempts').where({id:trial.id}).update({submitted_at:'2099-01-01 00:00:00'});
 const latest=await get('/results?sort=latestAt&order=desc&limit=1');assert.equal(latest.items[0].userId,other.id);assert.equal(latest.statistics.passRate,50);
 assert.equal((await get('/results?sort=latestAt&order=desc&limit=1&page=2')).items[0].userId,user.id);
 const queries=[];const observe=q=>queries.push(q.sql);db.on('query',observe);
 const summaryList=await rounds.list({status:'OPEN'},{admin:true});db.removeListener('query',observe);
 const summary=summaryList.items.find(r=>r.id===round.id).summary;
 assert.equal(summary.submittedCount,3);assert.equal(summary.inProgressCount,0);assert.equal(summary.participantCount,2);assert.equal(summary.passRate,50);assert.equal(summary.attemptCount,3);assert.equal(summary.hasAttempts,true);
 assert.equal(summaryList.statusCounts.OPEN,1);assert.equal(queries.filter(sql=>sql.includes('from `attempts`')).length,1,'One batched attempts query for the whole list');
 await rounds.update(round.id,{status:'CLOSED'});const closed=await get('/results');assert.equal(closed.statistics.failedCount,1);assert.equal(closed.statistics.passedCount,1);assert.equal(closed.items.find(row=>row.userId===user.id).finalResult,'PASSED');assert.equal(closed.items.find(row=>row.userId===user.id).usedAttempts,2);
 const filter='?partyCommittee=E2E%20%C4%90%E1%BA%A3ng%20A&partyBranch=E2E%20Chi%20A&result=PASSED&search=Ng%C6%B0%E1%BB%9Di';
 const filtered=await get('/results'+filter);assert.equal(filtered.items.length,1);assert.equal(filtered.statistics.attemptCount,2);assert.equal(filtered.items[0].bestPercentage,100);
 assert.equal((await get('/statistics'+filter)).participantCount,filtered.statistics.participantCount);
 const qs=await get('/question-statistics?sort=correctRate&order=desc');assert.equal(qs.items.length,2);
 for(const q of qs.items){assert.equal(q.encounterCount,3);assert.equal(q.correctCount,1);assert.equal(q.optionACount,1);assert.equal(q.optionBCount,1);assert.equal(q.unansweredCount,1);assert.match(q.content,/E2E Nội dung gốc/);}
 const filteredQuestions=await get('/question-statistics'+filter);for(const q of filteredQuestions.items){assert.equal(q.encounterCount,2);assert.equal(q.optionBCount,0);}
 const trials=await get('/results?isTrial=true');assert.equal(trials.statistics.attemptCount,1);assert.equal(trials.items[0].usedAttempts,1);
 const empty=await get('/results?search=khongco');assert.equal(empty.statistics.participantCount,0);assert.equal(empty.statistics.passRate,0);
 const exported=await call(prefix+'/export'+filter,adminCookie);assert.equal(exported.status,200);assert.match(exported.headers.get('content-type'),/spreadsheetml/);
 const workbook=new(require('exceljs').Workbook)();await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
 assert.deepEqual(workbook.worksheets.map(sheet=>sheet.name),['Tổng hợp','Chi tiết','Theo câu hỏi','Theo đảng bộ']);
 const detail=workbook.getWorksheet('Chi tiết');assert.equal(detail.rowCount,2);assert.equal(detail.getCell('A2').value,user.fullName);assert.equal(detail.getCell('E2').value,2);assert.equal(detail.getCell('F2').value,3);assert.equal(detail.getCell('G2').value,100);assert.equal(detail.getCell('H2').value,'Đạt');
 const byQuestion=workbook.getWorksheet('Theo câu hỏi');assert.equal(byQuestion.rowCount,3);assert.equal(byQuestion.getCell('D2').value,2);assert.equal(byQuestion.getCell('G2').value,1);assert.equal(byQuestion.getCell('K2').value,1);
 const summaryRows=workbook.getWorksheet('Tổng hợp').getSheetValues();assert.ok(summaryRows.some(row=>row?.[1]==='Tổng số người tham gia'&&row[2]===1));
 await exportAudit;
 assert.equal(audits.length,1);assert.equal(audits[0].actorUserId,admin.id);assert.equal(audits[0].participantCount,1);assert.equal(audits[0].filters.result,'PASSED');
 await t.test('Lọc SQL khớp kết quả cá nhân cho mọi trạng thái và lượt cuối đang làm',async()=>{
  const {finalResult,finalResultSql}=require('../modules/attempts/results.logic');
  for(const status of ['OPEN','CLOSED'])for(const counts of [{used:0,passed:0,active:0},{used:1,passed:1,active:0},{used:1,passed:0,active:0},{used:3,passed:0,active:1},{used:3,passed:0,active:0}]){
   const config={status,max_attempts:3};const now=Date.now();
   const [row]=await db.select(finalResultSql(db,config,now).wrap('',' as finalResult')).from(db.select(db.raw('? as used, ? as passed, ? as active',[counts.used,counts.passed,counts.active])).as('p'));
   assert.equal(row.finalResult,finalResult(config,counts,now));
  }
 });
 await t.test('Báo cáo chốt lười lượt hết hạn, thống kê câu chỉ tính lượt đã chốt',async()=>{
  await db('questions').whereIn('id',bank.map(q=>q.id)).update({deleted_at:null});
  const timed=await rounds.create({title:'E2E_ROUND_Báo cáo hết hạn',questionCount:1,durationMinutes:10,maxAttempts:1,status:'DRAFT'});
  await questions.create(timed.id,{questionCode:'E2E_Q_TIMED',category:'E2E Nhóm',content:'E2E câu',optionA:'Một',optionB:'Hai',correctAnswer:'A'});
  await rounds.update(timed.id,{status:'OPEN'});
  const pending=(await attempts.start(timed.id,user.id)).attempt;
  const reportService=require('../modules/reports/reports.service');
  assert.equal((await reportService.results(timed.id,{})).items[0].finalResult,'IN_PROGRESS_ROUND');
  assert.equal((await reportService.questions(timed.id,{})).items.length,0);
  await db('attempts').where({id:pending.id}).update({started_at:'2020-01-01 00:00:00',expires_at:'2020-01-01 00:10:00'});
  const ended=await reportService.results(timed.id,{result:'FAILED'});assert.equal(ended.statistics.failedCount,1);assert.equal(ended.items[0].bestPercentage,0);
  const byQuestion=await reportService.questions(timed.id,{result:'FAILED'});assert.equal(byQuestion.items.length,1);assert.equal(byQuestion.items[0].unansweredCount,1);
 });

});
