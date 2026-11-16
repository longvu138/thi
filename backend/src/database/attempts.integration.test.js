const test = require('node:test'); const assert = require('node:assert/strict');
const name = process.env.TEST_ATTEMPTS_DB_NAME;
if (name && !/^exam_attempts_test_[a-z0-9_]+$/.test(name)) throw new Error('TEST_ATTEMPTS_DB_NAME phải có tiền tố exam_attempts_test_');
if (name) process.env.DB_NAME = name;
process.env.JWT_SECRET = 'attempts-test-jwt-secret-long-value'; process.env.CSRF_SECRET = 'attempts-test-csrf-secret-long-value'; process.env.AUTH_COOKIE_SECURE = 'false';
test('Lượt thi: đồng thời, snapshot, IDOR, hết giờ, chạy thử và chấm đúng một lần', { skip: !name && 'Chưa đặt TEST_ATTEMPTS_DB_NAME cho database test riêng' }, async t => {
 const db = require('../config/database'); const migration = require('./test-foundation');
 const users = require('../modules/users/users.service'); const questions = require('../modules/questions/questions.service'); const rounds = require('./test-rounds');
 const service = require('../modules/attempts/attempts.service'); const { json } = require('../modules/attempts/attempts.logic');
 const { createUuid } = require('../utils/uuid'); let migrated = false; let server;
 t.after(async () => { try { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if(migrated){await require('./migrations/202611120001_attempt_receipts').down(db);await migration.down(db);} } finally { await db.destroy(); } });
 assert.equal((await db.raw('SHOW TABLES'))[0].length, 0, 'Chỉ dùng database test rỗng'); await migration.up(db);await require('./migrations/202611120001_attempt_receipts').up(db); migrated = true;
 const admin = await users.create({ username: 'e2e_attempt_admin', fullName: 'Admin test', role: 'ADMIN', password: '123456' });
 const user = await users.create({ username: 'e2e_attempt_user', fullName: 'User test', password: '123456' });
 const other = await users.create({ username: 'e2e_attempt_other', fullName: 'Other test', password: '123456' });
 const minimal = { title: 'E2E_ROUND_Lượt thi', questionCount: 3, durationMinutes: 30, maxAttempts: 3 };
 const round = await rounds.create(minimal);
 const bank = [];
 for (let index = 0; index < 6; index++) bank.push(await questions.create(round.id,{ questionCode: `E2E_Q_A_${index}`, category: 'E2E_Q_Lượt thi', content: `Nội dung ${index}`, optionA: 'Một', optionB: 'Hai', optionC: 'Ba', correctAnswer: 'A', allowShuffleOptions: index !== 0 }));
 await rounds.update(round.id,{status:'OPEN'});
 const createRound = async body => {
  const item = await rounds.create({...body,status:'DRAFT'});
  for(const q of bank) await questions.create(item.id,Object.fromEntries(['questionCode','category','content','optionA','optionB','optionC','optionD','correctAnswer','allowShuffleOptions'].map(key=>[key,q[key]])));
  return (await rounds.update(item.id,{status:'OPEN'})).after;
 };
 server = require('../app/application').listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
 const call = (path, method = 'GET', body, session) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const login = async username => { const response = await call('/auth/login', 'POST', { username, password: '123456' }); assert.equal(response.status, 200); const data = await response.json(); return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: data.csrfToken }; };
 const session = await login(user.username); const otherSession = await login(other.username); const adminSession = await login(admin.username);
 assert.equal((await call(`/exam-rounds/${round.id}/start`, 'POST', {})).status, 401);
 assert.equal((await call(`/exam-rounds/${round.id}/start`, 'POST', {}, adminSession)).status, 403);
 assert.equal((await call(`/exam-rounds/${round.id}/start`, 'POST', { userId: other.id }, session)).status, 422);
 const concurrent = await Promise.all(Array.from({ length: 6 }, () => call(`/exam-rounds/${round.id}/start`, 'POST', {}, session)));
 assert.equal(concurrent.filter(response => response.status === 201).length, 1); assert.ok(concurrent.every(response => [200, 201].includes(response.status)));
 const payloads = await Promise.all(concurrent.map(response => response.json())); const attempt = payloads[0]; assert.equal(new Set(payloads.map(value => value.id)).size, 1);
 assert.equal(attempt.questions.length, 3); assert.equal(new Set(attempt.questions.map(q => q.id)).size, 3);
 assert.equal(/correctAnswer|correct_answer|originalKey|isCorrect|correctCount/.test(JSON.stringify(attempt)), false);
 const persisted = await db('attempt_questions').where({ attempt_id: attempt.id }); assert.equal(new Set(persisted.map(q => q.question_id)).size, 3);
 const frozen = await db('attempts').where({ id: attempt.id }).first(); const frozenQuestions = await db('attempt_questions').where({ attempt_id: attempt.id }).orderBy('id');
 for (const q of bank) await questions.update(round.id,q.id, { content: 'Đã sửa ngân hàng', correctAnswer: 'B' });
 await questions.remove(round.id,bank[0].id);
 await rounds.update(round.id, { passingPercentage: 100, durationMinutes: 15, showCorrectAnswers: false });
 const resumed = await (await call(`/exam-rounds/${round.id}/start`, 'POST', {}, session)).json(); assert.equal(resumed.id, attempt.id); assert.equal(resumed.config.passingPercentage, 70);
 assert.deepEqual(await db('attempts').where({ id: attempt.id }).first(), frozen); assert.deepEqual(await db('attempt_questions').where({ attempt_id: attempt.id }).orderBy('id'), frozenQuestions);
 for (const [path, method, body] of [[`/attempts/${attempt.id}`, 'GET'], [`/attempts/${attempt.id}/answers`, 'PUT', { answers: [{ attemptQuestionId: persisted[0].id, selectedAnswer: 'A' }] }], [`/attempts/${attempt.id}/submit`, 'POST', {}]]) {
  assert.equal((await call(path, method, body)).status, 401); assert.equal((await call(path, method, body, adminSession)).status, 403); assert.equal((await call(path, method, body, otherSession)).status, 403);
 }
 assert.equal((await call(`/attempts/${attempt.id}/answers`, 'PUT', { answers: [{ attemptQuestionId: persisted[0].id, selectedAnswer: 'D' }] }, session)).status, 422);
 assert.equal((await call(`/attempts/${attempt.id}/answers`, 'PUT', { answers: [{ attemptQuestionId: createUuid(), selectedAnswer: 'A' }] }, session)).status, 422);
 const correct = persisted.map(q => ({ attemptQuestionId: q.id, selectedAnswer: q.correct_answer }));
 assert.equal((await call(`/attempts/${attempt.id}/answers`, 'PUT', { answers: correct }, { ...session, csrf: 'invalid' })).status, 403);
 assert.equal((await call(`/attempts/${attempt.id}/answers`, 'PUT', { answers: correct }, session)).status, 200);
 const restored = await (await call(`/attempts/${attempt.id}`, 'GET', undefined, session)).json(); assert.ok(restored.questions.every(q => q.selectedAnswer));
 const submitted = await Promise.all(Array.from({ length: 4 }, () => call(`/attempts/${attempt.id}/submit`, 'POST', {}, session)));
 const scores = await Promise.all(submitted.map(response => { assert.equal(response.status, 200); return response.json(); }));
 assert.ok(scores.every(value => value.result === 'PASS' && value.correctCount === 3)); assert.equal(new Set(scores.map(value => value.submittedAt)).size, 1);
 const scored = await db('attempts').where({ id: attempt.id }).first(); assert.equal(scored.in_progress_flag, null);
 assert.equal((await call(`/attempts/${attempt.id}/answers`, 'PUT', { answers: correct }, session)).status, 409);
 await service.submit(attempt.id, user.id); assert.deepEqual(await db('attempts').where({ id: attempt.id }).first(), scored);
 // Hết giờ chốt lười, kể cả request lưu bị trả 409, phải commit điểm.
 const second = (await service.start(round.id, user.id)).attempt;
 await db('attempts').where({ id: second.id }).update({ expires_at: new Date(Date.now() - 10000) });
 await assert.rejects(() => service.saveAnswers(second.id, user.id, { answers: [{ attemptQuestionId: second.questions[0].id, selectedAnswer: 'A' }] }), { statusCode: 409 });
 const expired = await db('attempts').where({ id: second.id }).first(); assert.equal(expired.status, 'EXPIRED'); assert.equal(expired.unanswered_count, 3); assert.equal(expired.result, 'FAIL');
 // Job và submit đồng thời dùng cùng đường chấm; không chấm lại.
 const third = (await service.start(round.id, user.id)).attempt;
 await db('attempts').where({ id: third.id }).update({ expires_at: new Date(Date.now() - 10000) });
 await Promise.all([service.expireBatch(), assert.rejects(()=>service.submit(third.id, user.id),{statusCode:409}), service.get(third.id, user.id)]);
 assert.equal((await db('attempts').where({ id: third.id }).first()).status, 'EXPIRED');
 await assert.rejects(() => service.start(round.id, user.id), { statusCode: 409 });
 // Max attempts = 1/2/3 và stopAfterPass tách biệt.
 for (const maxAttempts of [1, 2, 3]) {
  const item = await createRound({ ...minimal, maxAttempts, title: `E2E_ROUND_Max_${maxAttempts}` });
  for (let number = 1; number <= maxAttempts; number++) { const active = (await service.start(item.id, other.id)).attempt; assert.equal(active.attemptNumber, number); await service.submit(active.id, other.id); }
  await assert.rejects(() => service.start(item.id, other.id), { statusCode: 409 });
 }
 const stopped = await createRound({ ...minimal, stopAfterPass: true });
 const stoppedAttempt = (await service.start(stopped.id, other.id)).attempt;
 const stoppedQuestions = await db('attempt_questions').where({ attempt_id: stoppedAttempt.id });
 await service.saveAnswers(stoppedAttempt.id, other.id, { answers: stoppedQuestions.map(q => ({ attemptQuestionId: q.id, selectedAnswer: q.correct_answer })) });
 await service.submit(stoppedAttempt.id, other.id); await assert.rejects(() => service.start(stopped.id, other.id), { statusCode: 409 });
 // Khung giờ, hết giờ theo end_at và chế độ chạy thử trước chính thức.
 const time = Date.parse('2026-11-11T02:00:00Z');
 const trialRound = await createRound({ ...minimal, questionCount: 1, trialStartAt: '2026-11-11T01:00:00Z', startAt: '2026-11-11T02:00:00Z', endAt: '2026-11-11T02:10:00Z', maxAttempts: 1 });
 await assert.rejects(() => service.start(trialRound.id, user.id, { now: () => time - 7200000 }), { statusCode: 409 });
 const trial = (await service.start(trialRound.id, user.id, { now: () => time - 60000, trialOnly:true })).attempt; assert.equal(trial.isTrial, true); assert.equal(trial.expiresAt, '2026-11-11T02:00:00Z');
 await assert.rejects(()=>service.start(trialRound.id,user.id,{now:()=>time,trialOnly:true}),{statusCode:409});
 assert.equal(Number((await db('attempts').where({exam_round_id:trialRound.id,is_trial:0}).count('* as total'))[0].total),0);
 const official = (await service.start(trialRound.id, user.id, { now: () => time })).attempt; assert.equal(official.isTrial, false); assert.equal(official.attemptNumber, 1); assert.equal(official.expiresAt, '2026-11-11T02:10:00Z');
 assert.equal((await db('attempts').where({ id: trial.id }).first()).status, 'EXPIRED');
 const officialBefore = await db('attempts').where({ id: official.id }).first();
 assert.equal((await call(`/admin/exam-rounds/${trialRound.id}/trial-data`, 'DELETE', { confirm: true }, session)).status, 403);
 assert.equal((await call(`/admin/exam-rounds/${trialRound.id}/trial-data`, 'DELETE', {}, adminSession)).status, 422);
 assert.equal((await call(`/admin/exam-rounds/${trialRound.id}/trial-data`, 'DELETE', { confirm: true }, adminSession)).status, 200);
 assert.equal(await db('attempts').where({ id: trial.id }).first(), undefined); assert.deepEqual(await db('attempts').where({ id: official.id }).first(), officialBefore);
 await service.submit(official.id, user.id, { now: () => time + 1000 });
 await assert.rejects(() => service.start(trialRound.id, other.id, { now: () => time + 600000 }), { statusCode: 409 });
 await rounds.update(trialRound.id, { status: 'CLOSED' }); await assert.rejects(() => service.start(trialRound.id, other.id), { statusCode: 409 });
 // Bỏ chọn và giới hạn batch: không sửa một phần nếu có câu sai.
 const blankRound = await createRound({ ...minimal, questionCount: 1 }); const blank = (await service.start(blankRound.id, user.id)).attempt;
 await service.saveAnswers(blank.id, user.id, { answers: [{ attemptQuestionId: blank.questions[0].id, selectedAnswer: 'A' }] });
 await service.saveAnswers(blank.id, user.id, { answers: [{ attemptQuestionId: blank.questions[0].id, selectedAnswer: null }] });
 assert.equal((await service.get(blank.id, user.id)).questions[0].selectedAnswer, null);
 // Lưu và nộp cạnh tranh phải phản ánh đúng đáp án đã commit trước khi chấm.
 const racingRound = await createRound({...minimal,questionCount:1});
 const racing = (await service.start(racingRound.id,user.id)).attempt;
 const racingQuestion = await db('attempt_questions').where({attempt_id:racing.id}).first();
 await Promise.allSettled([service.saveAnswers(racing.id,user.id,{answers:[{attemptQuestionId:racingQuestion.id,selectedAnswer:racingQuestion.correct_answer}]}),service.submit(racing.id,user.id)]);
 const racingStored = await db('attempts').where({id:racing.id}).first();
 const racingAnswer = await db('attempt_answers').where({attempt_id:racing.id}).first();
 assert.equal(racingStored.correct_count,racingAnswer?.selected_answer===racingQuestion.correct_answer?1:0);
 // Thiếu câu sau khi đã OPEN: không để lại lượt rỗng hoặc tăng số lượt.
 const insufficient = await createRound({...minimal,questionCount:6});
 const insufficientQuestion=await db('questions').where({exam_round_id:insufficient.id}).first();
 await assert.rejects(()=>questions.remove(insufficient.id,insufficientQuestion.id),{statusCode:409});
 // Dữ liệu lỗi giả lập trong DB test kiểm tra lớp phòng vệ sinh đề.
 await db('questions').where({exam_round_id:insufficient.id}).update({deleted_at:db.fn.now()});
 await assert.rejects(()=>service.start(insufficient.id,user.id),{statusCode:409});
 assert.equal(Number((await db('attempts').where({exam_round_id:insufficient.id}).count('* as total'))[0].total),0);
 await db('questions').where({exam_round_id:insufficient.id}).update({deleted_at:null});
 // Ân hạn 3 giây: hiển thị hết giờ nhưng vẫn nhận nộp trong biên; sau biên chốt EXPIRED.
 const graceRound = await createRound({...minimal,questionCount:1});
 const grace = (await service.start(graceRound.id,user.id)).attempt;
 const graceTime = Date.parse('2026-11-11T04:00:00Z');
 await db('attempts').where({id:grace.id}).update({started_at:'2026-11-11 03:59:00',expires_at:'2026-11-11 04:00:00'});
 assert.equal((await service.get(grace.id,user.id,{now:()=>graceTime+2000})).status,'IN_PROGRESS');
 assert.equal((await service.submit(grace.id,user.id,{now:()=>graceTime+2500})).status,'SUBMITTED');
 const graceEnd = (await service.start(graceRound.id,user.id)).attempt;
 await db('attempts').where({id:graceEnd.id}).update({started_at:'2026-11-11 03:59:00',expires_at:'2026-11-11 04:00:00'});
 assert.equal((await service.get(graceEnd.id,user.id,{now:()=>graceTime+3000})).status,'EXPIRED');
 // Snapshot có khóa gốc và tên nhóm để phục vụ thống kê sau này, nhưng API không lộ.
 assert.ok(json((await db('attempt_questions').where({ attempt_id: blank.id }).first()).options_snapshot).every(option => option.originalKey));
 // Giai đoạn 6: API kết quả, snapshot và lịch sử cá nhân.
 const results = require('../modules/attempts/results.service');
 const resultRound = await createRound({...minimal,title:'E2E_ROUND_Kết quả',questionCount:2,showCorrectAnswers:true,shuffleOptions:false});
 const resultAttempt = (await service.start(resultRound.id,user.id)).attempt;
 const resultPath = `/attempts/${resultAttempt.id}/result`;
 for (const path of [resultPath,'/my-results']) {
  assert.equal((await call(path)).status,401);
  assert.equal((await call(path,'GET',undefined,adminSession)).status,403);
 }
 assert.equal((await call(resultPath,'GET',undefined,otherSession)).status,403);
 assert.equal((await call(resultPath,'GET',undefined,session)).status,409);
 assert.equal((await call('/attempts/invalid/result','GET',undefined,session)).status,422);
 assert.equal((await call('/my-results?examRoundId=invalid','GET',undefined,session)).status,422);
 assert.equal((await call(`/attempts/${createUuid()}/result`,'GET',undefined,session)).status,404);
 const resultQuestions=await db('attempt_questions').where({attempt_id:resultAttempt.id}).orderBy('position');
 await service.saveAnswers(resultAttempt.id,user.id,{answers:[{attemptQuestionId:resultQuestions[0].id,selectedAnswer:resultQuestions[0].correct_answer}]});
 await rounds.update(resultRound.id,{showCorrectAnswers:false,passingPercentage:1});
 const originalQuestion=await db('questions').where({id:resultQuestions[0].question_id}).first();
 await db('questions').where({id:originalQuestion.id}).update({content:'E2E_Q_Đã sửa',correct_answer:'B',deleted_at:db.fn.now()});
 const graded=await service.submit(resultAttempt.id,user.id);
 assert.equal(graded.result,'FAIL'); // 1/2 < 70%, không dùng ngưỡng mới 1%.
 const resultResponse=await call(resultPath,'GET',undefined,session);assert.equal(resultResponse.status,200);
 assert.equal(resultResponse.headers.get('cache-control'),'no-store');
 const detail=await resultResponse.json();
 assert.equal(detail.config.passingPercentage,70);assert.equal(detail.config.showCorrectAnswers,true);
 assert.equal(detail.questions[0].content,resultQuestions[0].content);
 assert.equal(detail.questions[0].correctAnswer,resultQuestions[0].correct_answer);
 assert.equal(detail.questions[0].selectedAnswer,resultQuestions[0].correct_answer);
 assert.ok(detail.questions.every(q=>q.options.every(o=>!Object.hasOwn(o,'originalKey'))));
 const before=await db('attempts').where({id:resultAttempt.id}).first();
 await call(resultPath,'GET',undefined,session);await service.submit(resultAttempt.id,user.id);
 const after=await db('attempts').where({id:resultAttempt.id}).first();
 assert.equal(String(before.submitted_at),String(after.submitted_at));assert.equal(before.result,after.result);
 await db('questions').where({id:originalQuestion.id}).update({content:originalQuestion.content,correct_answer:originalQuestion.correct_answer,deleted_at:null});
 const hiddenAttempt=(await service.start(resultRound.id,user.id)).attempt;
 await rounds.update(resultRound.id,{showCorrectAnswers:true});
 await service.submit(hiddenAttempt.id,user.id);
 const hidden=await (await call(`/attempts/${hiddenAttempt.id}/result`,'GET',undefined,session)).json();
 assert.equal(hidden.config.showCorrectAnswers,false);assert.ok(hidden.questions.every(q=>!Object.hasOwn(q,'correctAnswer')));
 const history=await (await call(`/my-results?examRoundId=${resultRound.id}&limit=1`,'GET',undefined,session)).json();
 assert.equal(history.pagination.total,2);assert.equal(history.items.length,1);assert.equal(history.summary.finalResult,'IN_PROGRESS_ROUND');
 assert.equal(history.summary.usedAttempts,2);
 const otherHistory=await results.list(other.id,{examRoundId:resultRound.id});assert.equal(otherHistory.items.length,0);assert.equal(otherHistory.summary.finalResult,'NOT_STARTED');
 // Lượt thử PASS không được tính vào kết quả cuối chính thức.
 const trialOnly=await createRound({...minimal,title:'E2E_ROUND_Chỉ thử',questionCount:1});
 const trialAttempt=(await service.start(trialOnly.id,user.id)).attempt;
 const trialQuestion=await db('attempt_questions').where({attempt_id:trialAttempt.id}).first();
 await service.saveAnswers(trialAttempt.id,user.id,{answers:[{attemptQuestionId:trialQuestion.id,selectedAnswer:trialQuestion.correct_answer}]});
 await service.submit(trialAttempt.id,user.id);await db('attempts').where({id:trialAttempt.id}).update({is_trial:1});
 const trialHistory=await results.list(user.id,{examRoundId:trialOnly.id});assert.equal(trialHistory.summary.finalResult,'NOT_STARTED');assert.equal(trialHistory.items[0].isTrial,true);
 // GET kết quả tự chốt lười cùng cơ chế hiện có; lịch sử vẫn giữ mọi lượt.
 const expiredResult=(await service.start(resultRound.id,user.id)).attempt;
 await db('attempts').where({id:expiredResult.id}).update({started_at:'2020-01-01 00:00:00',expires_at:'2020-01-01 00:30:00'});
 const ended=await (await call(`/attempts/${expiredResult.id}/result`,'GET',undefined,session)).json();assert.equal(ended.status,'EXPIRED');
 const finalHistory=await results.list(user.id,{examRoundId:resultRound.id});assert.equal(finalHistory.summary.finalResult,'FAILED');assert.equal(finalHistory.pagination.total,3);
 const allResults=await results.list(user.id,{limit:100});assert.ok(allResults.items.some(row=>row.examRoundId===resultRound.id&&row.finalResult==='FAILED'));

 await t.test('Lịch sử tự chốt lượt hết giờ, giữ PASS trước đó và không nhận userId để xem người khác', async () => {
  const reviewRound = await createRound({...minimal,title:'E2E_ROUND_Rà soát lịch sử',questionCount:1,showCorrectAnswers:false});
  const passed = (await service.start(reviewRound.id,user.id)).attempt;
  const question = await db('attempt_questions').where({attempt_id:passed.id}).first();
  await service.saveAnswers(passed.id,user.id,{answers:[{attemptQuestionId:question.id,selectedAnswer:question.correct_answer}]});
  await service.submit(passed.id,user.id);
  const savedPass = await db('attempts').where({id:passed.id}).first();
  const pending = (await service.start(reviewRound.id,user.id)).attempt;
  await db('attempts').where({id:pending.id}).update({started_at:'2020-01-01 00:00:00',expires_at:'2020-01-01 00:30:00'});
  const response = await call(`/my-results?examRoundId=${reviewRound.id}&userId=${other.id}`,'GET',undefined,session);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const personal = await response.json();
  assert.equal(personal.summary.finalResult,'PASSED');assert.equal(personal.summary.usedAttempts,2);
  assert.equal(personal.pagination.total,2);
  assert.equal(personal.items.find(row=>row.id===pending.id).status,'EXPIRED');
  assert.equal(personal.items.find(row=>row.id===pending.id).result,'FAIL');
  const expiredDetail = await (await call(`/attempts/${pending.id}/result`,'GET',undefined,session)).json();
  assert.equal(expiredDetail.status,'EXPIRED');assert.equal(expiredDetail.unansweredCount,1);
  assert.ok(expiredDetail.questions.every(row=>!Object.hasOwn(row,'correctAnswer')));
  const stranger = await (await call(`/my-results?examRoundId=${reviewRound.id}&userId=${user.id}`,'GET',undefined,otherSession)).json();
  assert.equal(stranger.items.length,0);assert.equal(stranger.summary.finalResult,'NOT_STARTED');
  await results.list(user.id,{examRoundId:reviewRound.id});
  const unchanged = await db('attempts').where({id:passed.id}).first();
  for (const field of ['result','correct_count','incorrect_count','unanswered_count','percentage','duration_seconds','config_snapshot']) assert.deepEqual(unchanged[field],savedPass[field]);
  assert.equal(String(unchanged.submitted_at),String(savedPass.submitted_at));
 });

 await t.test('Submit toàn bộ đáp án: nguyên tử, chấm một lần, 422 ngoài lượt và từ chối đáp án trễ',async()=>{
  const item=await createRound({...minimal,title:'E2E_ROUND_SUBMIT_ALL'}),active=(await service.start(item.id,user.id)).attempt;
  const qs=await db('attempt_questions').where({attempt_id:active.id});const answers=qs.map(q=>({attemptQuestionId:q.id,selectedAnswer:q.correct_answer}));const url=`/attempts/${active.id}/submit`;
  assert.equal((await call(url,'POST',{answers:[answers[0],{attemptQuestionId:createUuid(),selectedAnswer:'A'}]},session)).status,422);assert.equal(Number((await db('attempt_answers').where({attempt_id:active.id}).count('* as total'))[0].total),0);
  assert.equal((await call(url,'POST',{answers:[{attemptQuestionId:qs[0].id,selectedAnswer:'D'}]},session)).status,422);
  const responses=await Promise.all([call(url,'POST',{answers},session),call(url,'POST',{answers},session)]);assert.ok(responses.every(r=>r.status===200));const result=await responses[0].json();assert.equal(result.correctCount,3);
  const frozen=await db('attempts').where({id:active.id}).first(),saved=await db('attempt_answers').where({attempt_id:active.id}).orderBy('id');assert.equal((await call(url,'POST',{answers:answers.map(a=>({...a,selectedAnswer:null}))},session)).status,200);assert.deepEqual(await db('attempts').where({id:active.id}).first(),frozen);assert.deepEqual(await db('attempt_answers').where({attempt_id:active.id}).orderBy('id'),saved);
  const late=(await service.start(item.id,user.id)).attempt,lateQs=await db('attempt_questions').where({attempt_id:late.id});await service.saveAnswers(late.id,user.id,{answers:[{attemptQuestionId:lateQs[0].id,selectedAnswer:lateQs[0].correct_answer}]});await db('attempts').where({id:late.id}).update({expires_at:new Date(Date.now()-10000)});
  assert.equal((await call(`/attempts/${late.id}/submit`,'POST',{answers:lateQs.map(q=>({attemptQuestionId:q.id,selectedAnswer:q.correct_answer}))},session)).status,409);const ended=await db('attempts').where({id:late.id}).first();assert.equal(ended.status,'EXPIRED');assert.equal(ended.correct_count,1);assert.equal(ended.unanswered_count,2);assert.equal((await call(`/attempts/${late.id}/submit`,'POST',{answers:[]},session)).status,409);assert.deepEqual(await db('attempts').where({id:late.id}).first(),ended);
 });

});
