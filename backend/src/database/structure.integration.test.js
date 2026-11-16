const test=require('node:test'),assert=require('node:assert/strict');
const name=process.env.TEST_STRUCTURE_DB_NAME;
if(name&&!/^exam_structure_test_[a-z0-9_]+$/.test(name))throw new Error('TEST_STRUCTURE_DB_NAME phải có tiền tố exam_structure_test_');
if(name)process.env.DB_NAME=name;
process.env.JWT_SECRET='structure-jwt-secret-for-tests';process.env.CSRF_SECRET='structure-csrf-secret-for-tests';process.env.AUTH_COOKIE_SECURE='false';
test('Giai đoạn 11: cơ cấu, thứ tự, khóa chính thức, mẫu chỉ đọc và snapshot',{skip:!name&&'Chưa đặt TEST_STRUCTURE_DB_NAME cho DB test riêng'},async t=>{
 const db=require('../config/database'),foundation=require('./test-foundation'),identity=require('./migrations/202611110001_participant_identity'),receipts=require('./migrations/202611120001_attempt_receipts');
 const rounds=require('../modules/exam-rounds/exam-rounds.service'),structure=require('../modules/exam-rounds/structure.service'),questions=require('../modules/questions/questions.service'),attempts=require('../modules/attempts/attempts.service'),users=require('../modules/users/users.service');
 const {createUuid}=require('../utils/uuid'),{groupKey}=require('../modules/exam-rounds/structure.logic');
 let migrated=false,server;const logger=require('../utils/logger'),originalInfo=logger.info,audits=[];logger.info=function(payload,...args){audits.push(payload);return originalInfo.call(this,payload,...args);};
 t.after(async()=>{logger.info=originalInfo;try{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(migrated){await receipts.down(db);await foundation.down(db);assert.equal((await db.raw('SHOW TABLES'))[0].length,0);}}finally{await db.destroy();}});
 assert.equal((await db.raw('SHOW TABLES'))[0].length,0,'Chỉ dùng DB test rỗng');await foundation.up(db);migrated=true;await identity.up(db);await receipts.up(db);
 assert.equal(await db.schema.hasTable('exam_papers'),false);assert.equal(await db.schema.hasColumn('exam_rounds','papers_locked_at'),false);
 const admin=await users.create({username:'e2e_user_structure_admin',fullName:'E2E Admin',password:'123456',role:'ADMIN'}),user=await users.create({username:'e2e_user_structure_user',fullName:'E2E User',password:'123456',role:'USER'});
 const now=Date.now();const round=await rounds.create({title:'E2E_ROUND_STRUCTURE',durationMinutes:20,maxAttempts:3,shuffleQuestions:true,showCorrectAnswers:false,trialStartAt:new Date(now-3600000).toISOString(),startAt:new Date(now+3600000).toISOString(),endAt:new Date(now+10800000).toISOString()});
 assert.equal(round.questionCount,20);assert.deepEqual(round.selectionConfig,{mode:'RANDOM',groups:[]});
 await assert.rejects(()=>rounds.create({title:'Không nhận số câu',durationMinutes:5,maxAttempts:1,questionCount:3}),{statusCode:422});
 const rows=Array.from({length:100},(_,i)=>({id:createUuid(),exam_round_id:round.id,question_code:`E2E_Q_${i}`,category_name:`Nghị quyết ${i%10+1}`,content:`Nội dung gốc ${i}`,option_a:'Một',option_b:'Hai',option_c:'Ba',correct_answer:'A'}));await db('questions').insert(rows);
 const initial=await structure.get(round.id);assert.equal(initial.groups.length,10);assert.equal(initial.groups[1].category,'Nghị quyết 2');assert.equal(initial.groups[9].category,'Nghị quyết 10');assert.ok(initial.groups.every(g=>g.validCount===10&&g.count===0&&g.isNew));
 const groups=initial.groups.map((g,i)=>({category:g.category,count:3,order:9-i})),body={mode:'BY_GROUP',groups};
 const saved=await structure.save(round.id,body);assert.equal(saved.questionCount,30);assert.equal((await rounds.get(round.id,{admin:true})).questionCount,30);
 await assert.rejects(()=>structure.save(round.id,{mode:'BY_GROUP',groups:[{category:'Nghị quyết 1',count:11,order:0}]}),e=>e.statusCode===422&&e.groupErrors[0].available===10);
 // Nhóm 0 không được lấy; kiểm thử xem mẫu không thay bất kỳ bảng nghiệp vụ nào.
 const before={rounds:await db('exam_rounds').select('*'),attempts:await db('attempts').select('*'),questions:await db('questions').select('*')};
 const sample=await structure.preview(round.id,body);assert.equal(sample.questions.length,30);assert.equal(new Set(sample.questions.map(q=>q.id)).size,30);assert.ok(sample.questions.every(q=>q.correctAnswer));
 const expected=groups.toSorted((a,b)=>a.order-b.order).map(g=>g.category);
 assert.deepEqual(sample.questions.filter((q,i,all)=>i===0||q.categoryName!==all[i-1].categoryName).map(q=>q.categoryName),expected);
 for(const category of expected)assert.equal(sample.questions.filter(q=>q.categoryName===category).length,3);
 assert.deepEqual(await db('exam_rounds').select('*'),before.rounds);assert.deepEqual(await db('attempts').select('*'),before.attempts);assert.deepEqual(await db('questions').select('*'),before.questions);
 const zeroBody={mode:'BY_GROUP',groups:groups.map((g,i)=>({...g,count:i===0?0:3}))};assert.equal((await structure.preview(round.id,zeroBody)).questions.some(q=>q.categoryName===groups[0].category),false);
 // Một nhóm Unicode khác hoa/thường/khoảng trắng được gộp đúng, không đổi định mức khi import nhóm mới.
 await questions.create(round.id,{questionCode:'E2E_Q_NEW_GROUP',category:'Nghị quyết 11',content:'Nhóm mới',optionA:'Một',optionB:'Hai',correctAnswer:'A'});
 const fresh=await structure.get(round.id);assert.equal(fresh.groups.find(g=>g.category==='Nghị quyết 11').count,0);assert.equal(fresh.groups.find(g=>g.category==='Nghị quyết 11').isNew,true);
 const variant=rows.find(r=>r.category_name==='Nghị quyết 1');await db('questions').where({id:variant.id}).update({category_name:'  NGHỊ   QUYẾT 1 '.normalize('NFD')});assert.equal((await structure.get(round.id)).groups.find(g=>groupKey(g.category)===groupKey('Nghị quyết 1')).validCount,10);
 await rounds.update(round.id,{status:'OPEN'});
 const trial=(await attempts.start(round.id,user.id,{now:()=>now})).attempt;assert.equal(trial.isTrial,true);await attempts.submit(trial.id,user.id,{now:()=>now+1000});assert.equal((await structure.get(round.id)).locked,false);
 await structure.save(round.id,zeroBody);const snapshotBefore=await db('attempts').where({id:trial.id}).first();assert.equal((typeof snapshotBefore.config_snapshot==='string'?JSON.parse(snapshotBefore.config_snapshot):snapshotBefore.config_snapshot).questionCount,30);
 await structure.save(round.id,body);await attempts.clearTrialData(round.id);assert.equal((await structure.get(round.id)).locked,false);
 // Chính thức bắt đầu ở mốc thời gian kiểm soát, không thay đồng hồ máy.
 const official=(await attempts.start(round.id,user.id,{now:()=>now+3600001})).attempt;assert.equal(official.isTrial,false);assert.equal(official.questions.length,30);assert.equal((await structure.get(round.id)).locked,true);
 const frozen=await db('attempts').where({id:official.id}).first();assert.equal((typeof frozen.config_snapshot==='string'?JSON.parse(frozen.config_snapshot):frozen.config_snapshot).selectionConfig.mode,'BY_GROUP');
 await assert.rejects(()=>structure.save(round.id,zeroBody),{statusCode:409});
 await questions.update(round.id,rows[0].id,{content:'Nội dung đã thay'});assert.deepEqual(await db('attempts').where({id:official.id}).first(),frozen);assert.ok((await attempts.get(official.id,user.id,{now:()=>now+3601000})).questions.every(q=>q.content.startsWith('Nội dung gốc')));
 // Thiếu nhóm khi OPEN bị chặn, kể cả toàn ngân hàng vẫn đủ tổng.
 const critical=rows.filter(r=>r.category_name==='Nghị quyết 2');for(let i=0;i<7;i++)await questions.remove(round.id,critical[i].id);await assert.rejects(()=>questions.remove(round.id,critical[7].id),{statusCode:409});await assert.rejects(()=>questions.update(round.id,critical[7].id,{category:'Nghị quyết 11'}),{statusCode:409});
 await rounds.update(round.id,{status:'CLOSED'});await questions.remove(round.id,critical[7].id);await assert.rejects(()=>rounds.update(round.id,{status:'OPEN'}),{statusCode:409});
 const randomRound=await rounds.create({title:'E2E_ROUND_RANDOM300',durationMinutes:5,maxAttempts:1});
 for(let offset=0;offset<300;offset+=100)await db('questions').insert(Array.from({length:100},(_,j)=>({id:createUuid(),exam_round_id:randomRound.id,question_code:`E2E_Q_RANDOM_${offset+j}`,category_name:'RANDOM',content:'Câu ngẫu nhiên',option_a:'Một',option_b:'Hai',correct_answer:'A'})));
 await structure.save(randomRound.id,{mode:'RANDOM',count:50});const random=await structure.preview(randomRound.id,{mode:'RANDOM',count:50});assert.equal(random.questions.length,50);assert.equal(new Set(random.questions.map(q=>q.id)).size,50);assert.ok(random.questions.every(q=>!rows.some(r=>r.id===q.id)));
 server=require('../app/application').listen(0);const base=`http://127.0.0.1:${server.address().port}/api`;
 const call=(path,method='GET',body,session)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const login=async u=>{const r=await call('/auth/login','POST',{username:u.username,password:'123456'});assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrfToken};};const sa=await login(admin),su=await login(user),path=`/admin/exam-rounds/${randomRound.id}/structure`;
 for(const [suffix,method,payload] of [['','GET'],['','PUT',{mode:'RANDOM',count:50}],['/preview','POST',{mode:'RANDOM',count:50}]]){assert.equal((await call(path+suffix,method,payload)).status,401);assert.equal((await call(path+suffix,method,payload,su)).status,403);}
 assert.equal((await call(path,'PUT',{mode:'RANDOM',count:50},{cookie:sa.cookie,csrf:'bad'})).status,403);
 const countsBefore=await db('attempts').count('* as n');assert.equal((await call(path+'/preview','POST',{mode:'RANDOM',count:50},sa)).status,200);assert.deepEqual(await db('attempts').count('* as n'),countsBefore);assert.equal((await call(path,'PUT',{mode:'RANDOM',count:50},sa)).status,200);assert.equal((await call(path,'GET',undefined,sa)).status,200);
 const invalid=await call(path,'PUT',{mode:'BY_GROUP',groups:[{category:'RANDOM',count:301,order:0}]},sa);assert.equal(invalid.status,422);assert.equal((await invalid.json()).groupErrors[0].category,'RANDOM');
 assert.equal((await call(`/admin/exam-rounds/${round.id}/structure`,'PUT',body,sa)).status,409);assert.equal((await call(`/admin/exam-rounds/${round.id}/papers`,'GET',undefined,sa)).status,404);
 assert.ok(audits.some(x=>x?.event==='exam_structure_previewed'&&x.actorUserId===admin.id));assert.ok(audits.some(x=>x?.event==='exam_structure_updated'));
});
