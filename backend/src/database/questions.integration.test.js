const test=require('node:test');const assert=require('node:assert/strict');
const name=process.env.TEST_QUESTIONS_DB_NAME;
if(name && !/^exam_questions_test_[a-z0-9_]+$/.test(name))throw new Error('TEST_QUESTIONS_DB_NAME phải có tiền tố exam_questions_test_');
if(name)process.env.DB_NAME=name;
process.env.JWT_SECRET='questions-integration-test-secret-long';process.env.CSRF_SECRET='questions-csrf-test-secret-long';process.env.AUTH_COOKIE_SECURE='false';
test('Câu hỏi theo đợt: CRUD, import nguyên tử, xung đột và phân quyền',{skip:!name && 'Chưa đặt TEST_QUESTIONS_DB_NAME cho database test riêng'},async t=>{
 const db=require('../config/database');const migration=require('./test-foundation');const users=require('../modules/users/users.service');const questions=require('../modules/questions/questions.service');const {importQuestions}=require('../modules/questions/questions.import.service');const ExcelJS=require('exceljs');const app=require('../app/application');
 let migrated=false;let server;t.after(async()=>{try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}if(migrated){await require('./migrations/202611120001_attempt_receipts').down(db);await migration.down(db);}}finally{await db.destroy();}});
 assert.equal((await db.raw('SHOW TABLES'))[0].length,0,'Chỉ chạy trên database test rỗng');await migration.up(db);await require('./migrations/202611120001_attempt_receipts').up(db);migrated=true;
 const admin=await users.create({username:'e2e_q_admin',fullName:'Admin test',password:'valid-secret-123',role:'ADMIN'});await users.create({username:'e2e_q_user',fullName:'User test',password:'valid-secret-123'});
 server=app.listen(0);const base=`http://127.0.0.1:${server.address().port}/api`;
 const call=(path,method='GET',body,session)=>fetch(base+path,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
 const login=async username=>{const response=await call('/auth/login','POST',{username,password:'valid-secret-123'});assert.equal(response.status,200);return {cookie:response.headers.get('set-cookie').split(';')[0],csrf:(await response.json()).csrfToken};};
 const adminSession=await login(admin.username);const userSession=await login('e2e_q_user');
 const rounds=require('./test-rounds');
 const round=await rounds.create({title:'E2E_ROUND_Questions',questionCount:1,durationMinutes:10,maxAttempts:2});
 const roundId=round.id;const prefix=`/admin/exam-rounds/${roundId}/questions`;
 const q={questionCode:'E2E_Q_CRUD',category:'E2E_Q_Nhóm',content:'Nội dung test',optionA:'Một',optionB:'Hai',correctAnswer:'A'};
 const created=await call(prefix,'POST',q,adminSession);assert.equal(created.status,201);const saved=await created.json();assert.equal(saved.allowShuffleOptions,true);
 for(const session of [undefined,userSession])for(const [path,method,body]of [['','GET'],['/categories','GET'],['/export','GET'],[`/${saved.id}`,'GET'],['','POST',q],[`/${saved.id}`,'PATCH',{content:'X'}],[`/${saved.id}`,'DELETE'],['/import','POST',{}]])assert.equal((await call(prefix+path,method,body,session)).status,session?403:401);
 assert.equal((await call(prefix,'POST',{},adminSession)).status,422);assert.equal((await call(prefix,'POST',{...q,correctAnswer:'D'},adminSession)).status,422);
 assert.equal((await call(`${prefix}/${saved.id}`,'PATCH',{optionC:'Ba',optionD:'Bốn',correctAnswer:'D',allowShuffleOptions:false},adminSession)).status,200);
 const detail=await(await call(`${prefix}/${saved.id}`,'GET',undefined,adminSession)).json();assert.equal(detail.correctAnswer,'D');assert.equal(detail.allowShuffleOptions,false);
 assert.equal((await questions.list(roundId,{category:saved.category,search:'E2E_Q_CRUD'})).items.length,1);assert.equal((await questions.list(roundId,{search:'%'})).items.length,0);
 assert.equal((await call('/admin/questions/template','GET',undefined,adminSession)).status,200);assert.equal((await call(prefix+'/categories','GET',undefined,adminSession)).status,200);
 const buffer=async codes=>{const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Câu hỏi');sheet.addRow(['ma_cau_hoi', 'nhom_cau_hoi', 'noi_dung', 'lua_chon_a', 'lua_chon_b', 'lua_chon_c', 'lua_chon_d', 'dap_an_dung', 'cho_phep_xao_tron']);for(const code of codes)sheet.addRow([code,'E2E_Q_Import','Test','Một','Hai','','','B',false]);return Buffer.from(await book.xlsx.writeBuffer());};
 const upload=(file,mode,token)=>{const form=new FormData();form.append('mode',mode);form.append('file',new Blob([file]),'questions.xlsx');if(token)form.append('previewToken',token);return form;};
 const file=await buffer(['E2E_Q_IMPORT']);const previewResponse=await call(prefix+'/import','POST',upload(file,'preview'),adminSession);assert.equal(previewResponse.status,200);const preview=await previewResponse.json();assert.equal(preview.errorCount,0);assert.equal(Number((await db('questions').count('* as total'))[0].total),1);
 assert.equal((await call(prefix+'/import','POST',upload(file,'commit'),adminSession)).status,422);assert.equal((await call(prefix+'/import','POST',upload(file,'commit',preview.previewToken),adminSession)).status,200);assert.equal((await call(prefix+'/import','POST',upload(file,'commit',preview.previewToken),adminSession)).status,409);
 const invalidFile=await buffer(['E2E_Q_DUP','E2E_Q_DUP']);const invalidPreview=await importQuestions({roundId,mode:'preview',buffer:invalidFile,userId:admin.id});assert.equal(invalidPreview.errorCount,1);assert.equal(invalidPreview.previewToken,null);
 const unicodeFile=await buffer(['E2E_Q_Straße','E2E_Q_Strasse']);const unicodePreview=await importQuestions({roundId,mode:'preview',buffer:unicodeFile,userId:admin.id});assert.equal(unicodePreview.errorCount,1);assert.equal(unicodePreview.previewToken,null);
 const conflictFile=await buffer(['E2E_Q_CONFLICT']);const beforeConflict=await importQuestions({roundId,mode:'preview',buffer:conflictFile,userId:admin.id});await questions.create(roundId,{...q,questionCode:'E2E_Q_CONFLICT'});await assert.rejects(()=>importQuestions({roundId,mode:'commit',buffer:conflictFile,token:beforeConflict.previewToken,userId:admin.id}),{statusCode:409});
 const rollbackFile=await buffer(['E2E_Q_A_ROLLBACK','E2E_Q_B_FAIL']);const rollbackPreview=await importQuestions({roundId,mode:'preview',buffer:rollbackFile,userId:admin.id});
 await db.raw("CREATE TRIGGER e2e_question_fail BEFORE INSERT ON questions FOR EACH ROW BEGIN IF NEW.question_code = 'E2E_Q_B_FAIL' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi test rollback'; END IF; END");
 await assert.rejects(()=>importQuestions({roundId,mode:'commit',buffer:rollbackFile,token:rollbackPreview.previewToken,userId:admin.id}));assert.equal(Number((await db('questions').whereIn('question_code',['E2E_Q_A_ROLLBACK','E2E_Q_B_FAIL']).count('* as total'))[0].total),0);await db.raw('DROP TRIGGER e2e_question_fail');
 assert.equal((await call(`${prefix}/${saved.id}`,'DELETE',undefined,adminSession)).status,204);assert.equal((await call(`${prefix}/${saved.id}`,'GET',undefined,adminSession)).status,404);assert.equal((await call(prefix,'POST',q,adminSession)).status,201);
 await t.test('Cùng mã dùng được ở hai đợt; trùng trong đợt bị chặn; URL không truy cập chéo đợt',async()=>{
  const second=await rounds.create({title:'E2E_ROUND_Second',questionCount:1,durationMinutes:10,maxAttempts:2});
  const copied=await questions.create(second.id,q);
  assert.equal(copied.questionCode,q.questionCode);
  await assert.rejects(()=>questions.create(second.id,q),{statusCode:409});
  for(const [method,body]of [['GET'],['PATCH',{content:'Sai đợt'}],['DELETE']])assert.equal((await call(`${prefix}/${copied.id}`,method,body,adminSession)).status,404);
  assert.equal((await call('/admin/questions','GET',undefined,adminSession)).status,404);
  for(const session of [undefined,userSession])assert.equal((await call('/admin/questions/template','GET',undefined,session)).status,session?403:401);
 });
 await t.test('Xuất Excel rồi import sang đợt khác giữ dữ liệu và ràng buộc token theo đợt',async()=>{
  const exported=await call(prefix+'/export','GET',undefined,adminSession);assert.equal(exported.status,200);
  const bytes=Buffer.from(await exported.arrayBuffer());
  const target=await rounds.create({title:'E2E_ROUND_ExportImport',questionCount:1,durationMinutes:10,maxAttempts:2});
  const preview=await importQuestions({roundId:target.id,mode:'preview',buffer:bytes,userId:admin.id});assert.equal(preview.errorCount,0);
  await assert.rejects(()=>importQuestions({roundId,mode:'commit',buffer:bytes,token:preview.previewToken,userId:admin.id}),{statusCode:422});
  await importQuestions({roundId:target.id,mode:'commit',buffer:bytes,token:preview.previewToken,userId:admin.id});
  const fields=['questionCode','category','content','optionA','optionB','optionC','optionD','correctAnswer','allowShuffleOptions'];
  const data=async id=>(await questions.list(id,{limit:100})).items.map(q=>Object.fromEntries(fields.map(key=>[key,q[key]]))).sort((a,b)=>a.questionCode.localeCompare(b.questionCode));
  assert.deepEqual(await data(target.id),await data(roundId));
  await rounds.remove(target.id);assert.equal(Number((await db('questions').where({exam_round_id:target.id}).count('* as total'))[0].total),0);
 });
 await t.test('Câu A không vào đề B; chặn xóa làm OPEN thiếu câu; sửa và vô hiệu hóa giữ snapshot cũ',async()=>{
  const body={title:'E2E_ROUND_Isolated',questionCount:1,durationMinutes:10,maxAttempts:2,shuffleOptions:false};
  const a=await rounds.create(body),b=await rounds.create(body);
  const qa=await questions.create(a.id,{...q,questionCode:'E2E_Q_A_ONLY'});
  await assert.rejects(()=>rounds.update(b.id,{status:'OPEN'}),{statusCode:409});
  const qb=await questions.create(b.id,{...q,questionCode:'E2E_Q_B_ONLY',category:'E2E Nhóm gốc'});
  await rounds.update(a.id,{status:'OPEN'});await rounds.update(b.id,{status:'OPEN'});
  const user=await db('users').where({username:'e2e_q_user'}).first();
  const attempts=require('../modules/attempts/attempts.service');
  const attempt=(await attempts.start(b.id,user.id)).attempt;
  const snapshots=await db('attempt_questions').where({attempt_id:attempt.id});
  assert.equal(snapshots.length,1);assert.equal(snapshots[0].question_id,qb.id);assert.notEqual(snapshots[0].question_id,qa.id);assert.equal(snapshots[0].category_name,'E2E Nhóm gốc');
  await assert.rejects(()=>questions.remove(b.id,qb.id),{statusCode:409});
  await questions.update(b.id,qb.id,{content:'E2E Nội dung mới',category:'E2E Nhóm mới',correctAnswer:'B'});
  const spare=await questions.create(b.id,{...q,questionCode:'E2E_Q_SPARE'});
  const deletion=await questions.remove(b.id,qb.id);assert.equal(deletion.deletionMode,'disabled');assert.ok((await db('questions').where({id:qb.id}).first()).deleted_at);
  assert.deepEqual(await db('attempt_questions').where({attempt_id:attempt.id}),snapshots);
  await attempts.saveAnswers(attempt.id,user.id,{answers:[{attemptQuestionId:snapshots[0].id,selectedAnswer:snapshots[0].correct_answer}]});
  assert.equal((await attempts.submit(attempt.id,user.id)).result,'PASS');
  await assert.rejects(()=>questions.remove(b.id,spare.id),{statusCode:409});
  await assert.rejects(()=>rounds.remove(b.id),{statusCode:409});
 });

 await t.test('Hai thao tác xóa đồng thời không làm đợt OPEN thiếu câu',async()=>{
  const item=await rounds.create({title:'E2E_ROUND_Concurrent',questionCount:1,durationMinutes:10,maxAttempts:1});
  const one=await questions.create(item.id,{...q,questionCode:'E2E_Q_CONCURRENT_1'});
  const two=await questions.create(item.id,{...q,questionCode:'E2E_Q_CONCURRENT_2'});
  await rounds.update(item.id,{status:'OPEN'});
  const outcomes=await Promise.allSettled([questions.remove(item.id,one.id),questions.remove(item.id,two.id)]);
  assert.equal(outcomes.filter(value=>value.status==='fulfilled').length,1);
  assert.equal(outcomes.find(value=>value.status==='rejected').reason.statusCode,409);
  assert.equal((await questions.list(item.id)).validCount,1);
 });

 await t.test('Import HTTP câu A/B/C không có cột D: preview không ghi, commit đúng dữ liệu',async()=>{
  const item=await rounds.create({title:'E2E_ROUND_ABC_IMPORT',questionCount:1,durationMinutes:10,maxAttempts:1});
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Câu hỏi');
  sheet.addRow(['ma_cau_hoi','nhom_cau_hoi','noi_dung','lua_chon_a','lua_chon_b','lua_chon_c','dap_an_dung']);sheet.addRow(['E2E_Q_ABC_ONLY','Nhóm ABC','Câu ba lựa chọn','Một','Hai','Ba','C']);
  const file=Buffer.from(await book.xlsx.writeBuffer()),url=`/admin/exam-rounds/${item.id}/questions/import`;
  const response=await call(url,'POST',upload(file,'preview'),adminSession);assert.equal(response.status,200);const preview=await response.json();assert.equal(preview.validCount,1);assert.equal(preview.errorCount,0);assert.equal((await questions.list(item.id)).pagination.total,0);
  const committed=await call(url,'POST',upload(file,'commit',preview.previewToken),adminSession);assert.equal(committed.status,200);
  const saved=(await questions.list(item.id)).items[0];assert.equal(saved.optionC,'Ba');assert.equal(saved.optionD,'');assert.equal(saved.correctAnswer,'C');
 });

 await t.test('Import HTTP XLSX namespace có prefix: preview/commit và giữ nguyên nội dung',async()=>{
  const item=await rounds.create({title:'E2E_ROUND_XML_IMPORT',questionCount:1,durationMinutes:10,maxAttempts:1});
  const file=await require('../modules/questions/questions.test-fixtures').prefixedWorkbook();
  const url=`/admin/exam-rounds/${item.id}/questions/import`;
  const response=await call(url,'POST',upload(file,'preview'),adminSession);assert.equal(response.status,200);const preview=await response.json();assert.equal(preview.validCount,1);assert.equal(preview.errorCount,0);
  const committed=await call(url,'POST',upload(file,'commit',preview.previewToken),adminSession);assert.equal(committed.status,200);
  const saved=(await questions.list(item.id)).items[0];assert.equal(saved.content,'Nội dung <x:si> & "nguyên vẹn"');assert.equal(saved.optionC,'Ba');assert.equal(saved.correctAnswer,'C');
 });

});
