const test = require('node:test');
const assert = require('node:assert/strict');
const name = process.env.TEST_ROUNDS_DB_NAME;
if (name && !/^exam_rounds_test_[a-z0-9_]+$/.test(name)) throw new Error('TEST_ROUNDS_DB_NAME phải có tiền tố exam_rounds_test_');
if (name) process.env.DB_NAME = name;
process.env.JWT_SECRET = 'exam-rounds-integration-jwt-secret-long';
process.env.CSRF_SECRET = 'exam-rounds-integration-csrf-secret-long';
process.env.AUTH_COOKIE_SECURE = 'false';
test('Đợt kiểm tra: cấu hình, mở đủ câu, phân quyền, UTC và giữ snapshot lịch sử', { skip: !name && 'Chưa đặt TEST_ROUNDS_DB_NAME cho database test riêng' }, async t => {
 const db = require('../config/database');
 const migration = require('./test-foundation');
 const users = require('../modules/users/users.service');
 const questions = require('../modules/questions/questions.service');
 const rounds = require('./test-rounds');
 const { createUuid } = require('../utils/uuid');
 const app = require('../app/application');
 let migrated = false; let server;
 t.after(async () => {
  try {
   if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
   if(migrated){await require('./migrations/202611120001_attempt_receipts').down(db);await migration.down(db);}
  } finally { await db.destroy(); }
 });
 assert.equal((await db.raw('SHOW TABLES'))[0].length, 0, 'Chỉ chạy trên database test rỗng');
 await migration.up(db);await require('./migrations/202611120001_attempt_receipts').up(db); migrated = true;
 await users.create({ username: 'e2e_round_admin', fullName: 'Quản trị test', password: '123456', role: 'ADMIN' });
 const user = await users.create({ username: 'e2e_round_user', fullName: 'Người dùng test', password: '123456' });
 const question = { questionCode: 'E2E_Q_ROUND_1', category: 'E2E_Q_Nhóm một', content: 'Nội dung test', optionA: 'Một', optionB: 'Hai', correctAnswer: 'A' };
 server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
 const call = (path, method = 'GET', body, session) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const login = async username => {
  const response = await call('/auth/login', 'POST', { username, password: '123456' }); assert.equal(response.status, 200);
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: (await response.json()).csrfToken };
 };
 const admin = await login('e2e_round_admin'); const member = await login(user.username);
 const minimal = { title: 'E2E_ROUND_Bản nháp', durationMinutes: 30, maxAttempts: 2 };
 const created = await call('/admin/exam-rounds', 'POST', minimal, admin); assert.equal(created.status, 201);
 const draft = await created.json(); assert.equal(draft.status, 'DRAFT'); assert.equal(draft.passingPercentage, 70);
 for (const [path, method, body] of [
  ['/admin/exam-rounds', 'GET'], [`/admin/exam-rounds/${draft.id}`, 'GET'], ['/admin/exam-rounds', 'POST', minimal],
  [`/admin/exam-rounds/${draft.id}`, 'PATCH', { title: 'X' }], [`/admin/exam-rounds/${draft.id}`, 'PUT', { title: 'X' }], [`/admin/exam-rounds/${draft.id}`, 'DELETE'],
 ]) {
  assert.equal((await call(path, method, body)).status, 401);
  assert.equal((await call(path, method, body, member)).status, 403);
 }
 assert.equal((await call('/exam-rounds')).status, 401);
 assert.equal((await call(`/exam-rounds/${draft.id}`)).status, 401);
 assert.equal((await call(`/exam-rounds/${draft.id}`, 'GET', undefined, member)).status, 404);
 assert.equal((await (await call('/exam-rounds', 'GET', undefined, member)).json()).items.length, 0);
 assert.equal((await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', { status: 'OPEN' }, admin)).status, 409);
 assert.equal((await rounds.get(draft.id, { admin: true })).status, 'DRAFT');
 assert.equal((await call('/admin/exam-rounds', 'POST', { ...minimal, status: 'OPEN' }, admin)).status, 409);
 assert.equal((await call('/admin/exam-rounds', 'POST', {}, admin)).status, 422);
 assert.equal((await call('/admin/exam-rounds', 'POST', { ...minimal, categoryIds: [createUuid()] }, admin)).status, 422);
 assert.equal((await call('/admin/exam-rounds', 'GET', undefined, admin)).status, 200);
 assert.equal((await call('/admin/exam-rounds?status=INVALID', 'GET', undefined, admin)).status, 422);
 assert.equal((await call('/admin/exam-rounds/invalid', 'GET', undefined, admin)).status, 422);
 const wrongCsrf = await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', { title: 'Không được sửa' }, { cookie: admin.cookie, csrf: 'invalid' });
 assert.equal(wrongCsrf.status, 403); assert.equal((await wrongCsrf.json()).code, 'CSRF_TOKEN_INVALID');
 const q1 = await questions.create(draft.id,question);
 let q2 = await questions.create(draft.id,{...question,questionCode:'E2E_Q_ROUND_2',category:'E2E_Q_Nhóm hai'});
 await questions.remove(draft.id,q2.id);
 assert.equal(await db('questions').where({id:q2.id}).first(),undefined);
 assert.equal((await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', {status:'OPEN'}, admin)).status,409);
 q2 = await questions.create(draft.id,{...question,questionCode:'E2E_Q_ROUND_2',category:'E2E_Q_Nhóm hai'});
 await db('questions').where({id:q2.id}).update({correct_answer:'C',option_c:null});
 assert.equal((await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', {status:'OPEN'}, admin)).status,409);
 await db('questions').where({id:q2.id}).update({correct_answer:'A'});
 assert.equal((await call(`/admin/exam-rounds/${draft.id}/structure`,'PUT',{mode:'RANDOM',count:2},admin)).status,200);
 const full = { ...minimal, title: 'E2E_ROUND_Đang mở', description: 'Mô tả test', passingPercentage: 80, stopAfterPass: true, showCorrectAnswers: false, shuffleQuestions: false, shuffleOptions: false, status: 'OPEN', startAt: '2026-11-10T08:00:00+07:00', endAt: '2026-11-10T10:00:00+07:00' };
 const opened = await call(`/admin/exam-rounds/${draft.id}`, 'PUT', full, admin); assert.equal(opened.status, 200);
 const open = await opened.json(); assert.equal(open.startAt, '2026-11-10T01:00:00Z'); assert.equal(open.endAt, '2026-11-10T03:00:00Z');
 const fullCreated = await call('/admin/exam-rounds', 'POST', { ...full, status:'DRAFT', title: 'E2E_ROUND_Tạo đủ trường' }, admin); assert.equal(fullCreated.status, 201);
 const fullCreatedRound = await fullCreated.json(); assert.equal(fullCreatedRound.showCorrectAnswers, false); assert.equal(fullCreatedRound.stopAfterPass, true);
 assert.equal((await call(`/admin/exam-rounds/${fullCreatedRound.id}`, 'DELETE', undefined, admin)).status, 204);
 const visible = await (await call('/exam-rounds?status=OPEN', 'GET', undefined, member)).json(); assert.equal(visible.items.length, 1);
 const userDetail = await (await call(`/exam-rounds/${draft.id}`, 'GET', undefined, member)).json(); assert.equal(userDetail.title, full.title); assert.equal(JSON.stringify(userDetail).includes('correctAnswer'), false);
 assert.equal((await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', { endAt: '2026-11-10T00:00:00Z' }, admin)).status, 422);
 assert.equal((await rounds.get(draft.id, { admin: true })).endAt, '2026-11-10T03:00:00Z');
 const pagination = await (await call('/admin/exam-rounds?page=bad&limit=0', 'GET', undefined, admin)).json(); assert.equal(pagination.pagination.page, 1); assert.equal(pagination.pagination.limit, 1);
 assert.equal((await rounds.list({ search: '%' }, { admin: true })).items.length, 0);
 // Fixture lịch sử chỉ trên database test; không triển khai luồng tạo lượt thi.
 const attemptId = createUuid(); const questionId = createUuid();
 const config = { questionCount: 2, durationMinutes: 30, passingPercentage: 80, showCorrectAnswers: false, shuffleQuestions: false, shuffleOptions: false };
 await db('attempts').insert({ id: attemptId, user_id: user.id, exam_round_id: draft.id, attempt_number: 1, started_at: '2026-11-10 01:00:00', expires_at: '2026-11-10 01:30:00', status: 'SUBMITTED', in_progress_flag: null, config_snapshot: JSON.stringify(config), correct_count: 2, result: 'PASS' });
 await db('attempt_questions').insert({ id: questionId, attempt_id: attemptId, question_id: q1.id, content: 'Nội dung snapshot', position: 1, options_snapshot: JSON.stringify([{ key: 'A', content: 'Một' }, { key: 'B', content: 'Hai' }]), correct_answer: 'A' });
 const historicalAttempt = await db('attempts').where({ id: attemptId }).first(); const historicalQuestion = await db('attempt_questions').where({ id: questionId }).first();
 const changed = await call(`/admin/exam-rounds/${draft.id}`, 'PATCH', { durationMinutes: 15, maxAttempts: 1, passingPercentage: 50, showCorrectAnswers: true, status: 'CLOSED', startAt: null, endAt: null }, admin); assert.equal(changed.status, 200);
 assert.deepEqual(await db('attempts').where({ id: attemptId }).first(), historicalAttempt); assert.deepEqual(await db('attempt_questions').where({ id: questionId }).first(), historicalQuestion);
 assert.equal((await call(`/admin/exam-rounds/${draft.id}`, 'DELETE', undefined, admin)).status, 409);
 assert.equal((await call(`/exam-rounds/${draft.id}`, 'GET', undefined, member)).status, 200);
 const disposable = await rounds.create({ ...minimal, title: 'E2E_ROUND_Xóa test' });
 await questions.create(disposable.id,{...question,questionCode:'E2E_Q_DISPOSE'});
 assert.equal((await call(`/admin/exam-rounds/${disposable.id}`, 'DELETE', undefined, admin)).status, 204);
 assert.equal((await call(`/admin/exam-rounds/${disposable.id}`, 'GET', undefined, admin)).status, 404);
 assert.equal(Number((await db('questions').where({ exam_round_id: disposable.id }).count('* as total'))[0].total), 0);
});
