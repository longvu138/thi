const test=require('node:test');const assert=require('node:assert/strict');
const name=process.env.TEST_RECEIPTS_DB_NAME;
if(name&&!/^exam_receipts_test_[a-z0-9_]+$/.test(name))throw new Error('TEST_RECEIPTS_DB_NAME phải có tiền tố exam_receipts_test_');
if(name)process.env.DB_NAME=name;
process.env.JWT_SECRET='receipt-test-jwt-secret-long';process.env.CSRF_SECRET='receipt-test-csrf-secret-long';process.env.AUTH_COOKIE_SECURE='false';
test('Phiếu kết quả: snapshot, mã tra cứu công khai, IDOR, hết giờ, chạy thử và giới hạn tra cứu',{skip:!name&&'Chưa đặt TEST_RECEIPTS_DB_NAME cho database test riêng'},async t=>{
 const db=require('../config/database'),foundation=require('./test-foundation'),migration=require('./migrations/202611120001_attempt_receipts');
 const rounds=require('./test-rounds'),questions=require('../modules/questions/questions.service'),users=require('../modules/users/users.service'),attempts=require('../modules/attempts/attempts.service'),receipts=require('../modules/receipts/receipts.service');
 let migrated=false,server;
 t.after(async()=>{try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}if(migrated){await migration.down(db);await foundation.down(db);}}finally{await db.destroy();}});
 assert.equal((await db.raw('SHOW TABLES'))[0].length,0,'Chỉ dùng database test rỗng');await foundation.up(db);migrated=true;await require('./migrations/202611110001_participant_identity').up(db);await migration.up(db);
 const user=await users.create({username:'e2e_receipt_user',fullName:'E2E Họ tên gốc',password:'123456'}),other=await users.create({username:'e2e_receipt_other',fullName:'E2E Người khác',password:'123456'}),admin=await users.create({username:'e2e_receipt_admin',fullName:'E2E Admin',password:'123456',role:'ADMIN'});
 await db('users').where({id:user.id}).update({party_committee:'E2E Đảng bộ gốc',party_branch:'E2E Chi bộ gốc'});
 const round=await rounds.create({title:'E2E_ROUND_Phiếu',questionCount:2,durationMinutes:10,maxAttempts:5});
 for(let i=0;i<2;i++)await questions.create(round.id,{questionCode:`E2E_Q_RECEIPT_${i}`,category:'E2E Nhóm',content:'Nội dung gốc',optionA:'Một',optionB:'Hai',correctAnswer:'A'});
 await rounds.update(round.id,{status:'OPEN'});
 const active=(await attempts.start(round.id,user.id)).attempt;
 await assert.rejects(()=>receipts.forAttempt(active.id,user.id),{statusCode:409});
 // Thay thông tin sau khi bắt đầu không được thay snapshot nhận diện trên phiếu.
 await db('users').where({id:user.id}).update({full_name:'E2E Đã sửa',party_branch:'E2E Đã sửa chi bộ'});
 const qs=await db('attempt_questions').where({attempt_id:active.id});await attempts.saveAnswers(active.id,user.id,{answers:[{attemptQuestionId:qs[0].id,selectedAnswer:qs[0].correct_answer}]});
 const finished=await attempts.submit(active.id,user.id);assert.equal(finished.result,'FAIL');assert.ok(finished.receiptCode);
 const copies=await Promise.all(Array.from({length:4},()=>receipts.forAttempt(active.id,user.id)));assert.equal(new Set(copies.map(x=>x.verificationCode)).size,1);
 const receipt=copies[0];assert.equal(receipt.fullName,'E2E Họ tên gốc');assert.equal(receipt.partyBranch,'E2E Chi bộ gốc');assert.equal(receipt.correctCount,1);assert.equal(receipt.wrongCount,1);assert.equal(receipt.unansweredCount,1);assert.equal(receipt.score10,5);
 const frozen=await db('attempts').where({id:active.id}).first();
 await rounds.update(round.id,{title:'E2E_ROUND_Đổi tên',passingPercentage:1});await db('questions').where({exam_round_id:round.id}).update({content:'E2E Sửa câu'});
 assert.deepEqual(await receipts.forAttempt(active.id,user.id),receipt);assert.deepEqual(await db('attempts').where({id:active.id}).first(),frozen);
 const repeated=await attempts.submit(active.id,user.id);assert.equal(repeated.receiptCode,receipt.verificationCode);
 server=require('../app/application').listen(0);const base=`http://127.0.0.1:${server.address().port}/api`;
 const call=(path,method='GET',body,session)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const login=async username=>{const response=await call('/auth/login','POST',{username,password:'123456'});assert.equal(response.status,200);return {cookie:response.headers.get('set-cookie').split(';')[0],csrf:(await response.json()).csrfToken};};
 const owner=await login(user.username),stranger=await login(other.username),adminSession=await login(admin.username);
 const path=`/attempts/${active.id}/receipt`;
 assert.equal((await call(path)).status,401);assert.equal((await call(path,'GET',undefined,stranger)).status,403);assert.equal((await call(path,'GET',undefined,adminSession)).status,403);assert.equal((await call('/attempts/invalid/receipt','GET',undefined,owner)).status,422);
 assert.equal((await call(path,'GET',undefined,owner)).status,200);
 const publicResponse=await call('/receipts/lookup','POST',{code:receipt.verificationCode.toLowerCase()});assert.equal(publicResponse.status,200);assert.equal(publicResponse.headers.get('cache-control'),'no-store');const publicData=await publicResponse.json();assert.deepEqual(publicData,receipt);assert.equal(/questions|options|correctAnswer|userId|attemptId/.test(JSON.stringify(publicData)),false);
 assert.equal((await call('/receipts/lookup','POST',{})).status,422);assert.equal((await call('/receipts/lookup','POST',{code:receipt.verificationCode,userId:other.id})).status,422);assert.equal((await call('/receipts/lookup','POST',{code:'0000-0000-0000-0000-0000'})).status,404);
 const expired=(await attempts.start(round.id,user.id)).attempt;await db('attempts').where({id:expired.id}).update({expires_at:new Date(Date.now()-10000)});await attempts.expireOne(expired.id);const expiredReceipt=await receipts.forAttempt(expired.id,user.id);assert.equal(expiredReceipt.status,'EXPIRED');assert.equal(expiredReceipt.wrongCount,2);
 // Lượt thử được đánh dấu; xóa thử dọn phiếu thử cùng transaction, giữ chính thức.
 const trial=(await attempts.start(round.id,user.id)).attempt;await db('attempts').where({id:trial.id}).update({is_trial:1});await attempts.submit(trial.id,user.id);const trialReceipt=await receipts.forAttempt(trial.id,user.id);assert.equal(trialReceipt.isTrial,true);
 await attempts.clearTrialData(round.id);await assert.rejects(()=>receipts.lookup({code:trialReceipt.verificationCode}),{statusCode:404});assert.deepEqual((await receipts.lookup({code:receipt.verificationCode})).receipt,receipt);
 // Hỗ trợ lượt cũ đã chốt nhưng chưa có phiếu, không ghi đè điểm/snapshot.
 await db('attempt_receipts').where({attempt_id:expired.id}).delete();const before=await db('attempts').where({id:expired.id}).first();await receipts.forAttempt(expired.id,user.id);assert.deepEqual(await db('attempts').where({id:expired.id}).first(),before);
 let limited=false;for(let i=0;i<32;i++){const response=await call('/receipts/lookup','POST',{code:'0000-0000-0000-0000-0000'});if(response.status===429){limited=true;break;}}assert.equal(limited,true);
});
