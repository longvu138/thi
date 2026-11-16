const { toDate } = require('../../utils/datetime');
const roundEnded = (round, now) => round.status !== 'OPEN' || Boolean(round.end_at && now >= toDate(round.end_at).getTime());
// Chỉ nhận tổng hợp lượt chính thức; kết quả từng lượt không bị ghi đè.
const finalResult = (round, { used = 0, passed = 0, active = 0 } = {}, now = Date.now()) => {
 if (Number(passed) > 0) return 'PASSED';
 if (Number(used) === 0) return 'NOT_STARTED';
 const ended = roundEnded(round, now);
 if (ended) return 'FAILED';
 // Lượt cuối đang làm vẫn có thể đạt trước khi đợt đóng.
 if (Number(active) > 0) return 'IN_PROGRESS_ROUND';
 return ended || Number(used) >= Number(round.max_attempts) ? 'FAILED' : 'IN_PROGRESS_ROUND';
};
// Cùng thứ tự ưu tiên với finalResult, dùng khi lọc tập người ngay trong SQL.
const finalResultSql = (client, round, now) => client.raw("CASE WHEN p.passed > 0 THEN 'PASSED' WHEN p.used = 0 THEN 'NOT_STARTED' WHEN ? THEN 'FAILED' WHEN p.active > 0 THEN 'IN_PROGRESS_ROUND' WHEN p.used >= ? THEN 'FAILED' ELSE 'IN_PROGRESS_ROUND' END", [roundEnded(round, now), Number(round.max_attempts)]);
module.exports = { finalResult, finalResultSql };
