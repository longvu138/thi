const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRound, validateQuery } = require('./exam-rounds.validator');
const minimal = { title: ' Đợt test ', durationMinutes: 30, maxAttempts: 2 };
test('Đợt kiểm tra tối thiểu có cấu hình mặc định không cần câu hỏi hoặc nhóm', () => {
 const value = validateRound(minimal);
 assert.equal(value.title, 'Đợt test'); assert.equal(value.status, 'DRAFT'); assert.equal(value.passingPercentage, 70); assert.equal(value.stopAfterPass, false); assert.equal(value.showCorrectAnswers, true);
});
test('Từ chối số không hợp lệ, trạng thái sai, tùy chọn sai và trường chọn nhóm cũ', () => {
 for (const changes of [{ title: '' }, { questionCount: 0 }, {questionCount:20}, {selectionConfig:{mode:'RANDOM',groups:[]}}, { questionCount: '20' }, { durationMinutes: 1.5 }, { maxAttempts: -1 }, { passingPercentage: 101 }, { passingPercentage: 69.5 }, { status: 'INVALID' }, { stopAfterPass: 'false' }, { categoryIds: [] }, { categoryIds: ['invalid'] }, { categoryIds: ['11111111-1111-4111-8111-111111111111'] }]) {
  assert.throws(() => validateRound({ ...minimal, ...changes }), { statusCode: 422 });
 }
 assert.throws(() => validateRound({}), { statusCode: 422 }); assert.throws(() => validateRound({}, { partial: true }), { statusCode: 422 });
 assert.throws(() => validateQuery({ status: 'INVALID' }), { statusCode: 422 });
});
test('Thời gian có múi giờ được chuẩn hóa UTC, từ chối ngày sai và khoảng đảo ngược', () => {
 const value = validateRound({ ...minimal, startAt: '2026-11-10T08:00:00+07:00', endAt: '2026-11-10T02:00:00Z' });
 assert.equal(value.startAt, '2026-11-10T01:00:00Z');
 for (const startAt of ['2026-02-30T08:00:00+07:00', '2026-11-10T08:00:00', '2026-13-01T00:00:00Z', '2026-11-10T24:00:00Z']) assert.throws(() => validateRound({ ...minimal, startAt }), { statusCode: 422 });
 assert.throws(() => validateRound({ ...minimal, startAt: '2026-11-10T02:00:00Z', endAt: '2026-11-10T02:00:00Z' }), { statusCode: 422 });
 assert.equal(validateRound({ ...minimal, startAt: null, endAt: null }).endAt, null);
});

test('Thời gian chạy thử bắt buộc đứng trước thời điểm chính thức',()=>{
 assert.throws(()=>validateRound({...minimal,trialStartAt:'2026-11-11T01:00:00Z'}),{statusCode:422});
 assert.throws(()=>validateRound({...minimal,trialStartAt:'2026-11-11T02:00:00Z',startAt:'2026-11-11T01:00:00Z'}),{statusCode:422});
 assert.equal(validateRound({...minimal,trialStartAt:'2026-11-11T01:00:00Z',startAt:'2026-11-11T02:00:00Z'}).trialStartAt,'2026-11-11T01:00:00Z');
});
