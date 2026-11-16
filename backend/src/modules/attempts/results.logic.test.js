const test = require('node:test'); const assert = require('node:assert/strict');
const { finalResult } = require('./results.logic');
const round = { status: 'OPEN', max_attempts: 3 };
test('Kết quả cuối ưu tiên PASS, chưa thi là NOT_STARTED, còn lượt được tiếp tục', () => {
 assert.equal(finalResult(round, { used: 3, passed: 1 }), 'PASSED');
 assert.equal(finalResult({ ...round, status: 'CLOSED' }, { used: 0 }), 'NOT_STARTED');
 assert.equal(finalResult(round, { used: 1 }), 'IN_PROGRESS_ROUND');
 assert.equal(finalResult(round, { used: 3 }), 'FAILED');
 assert.equal(finalResult(round, { used: 3, active: 1 }), 'IN_PROGRESS_ROUND');
});
test('Đợt đóng/hết khung giờ không đạt; PASS vẫn giữ sau khi đóng', () => {
 for (const closed of [{ ...round, status: 'CLOSED' }, { ...round, end_at: '2026-01-01 00:00:00' }]) {
  assert.equal(finalResult(closed, { used: 1 }, Date.parse('2026-01-02T00:00:00Z')), 'FAILED');
  assert.equal(finalResult(closed, { used: 1, passed: 1 }), 'PASSED');
 }
});
