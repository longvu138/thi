const db = require('../../config/database');
const attempts = require('./attempts.service');
const { json } = require('./attempts.logic');
const { finalResult } = require('./results.logic');
const { validateId } = require('./attempts.validator');
const { parsePagination, buildPagination } = require('../../utils/pagination');
const { toIsoUtc } = require('../../utils/datetime');
const { httpError } = require('../../utils/http-error');

const historyItem = row => ({
 id: row.id, examRoundId: row.exam_round_id, title: json(row.config_snapshot).title,
 attemptNumber: Number(row.attempt_number), isTrial: Boolean(row.is_trial), status: row.status,
 startedAt: toIsoUtc(row.started_at), submittedAt: toIsoUtc(row.submitted_at),
 result: row.result, percentage: row.percentage === null ? null : Number(row.percentage),
});
const list = async (userId, query = {}, { now = Date.now } = {}) => {
 if (query.examRoundId !== undefined) validateId(query.examRoundId);
 const time = now();
 // Chốt lười bằng cùng hàm khóa/chấm của submit/job, đọc theo lô giới hạn.
 let cursor;
 while (true) {
  const overdue = db('attempts').where({ user_id: userId, status: 'IN_PROGRESS' }).where('expires_at', '<=', new Date(time)).orderBy('id').limit(100).select('id');
  if (query.examRoundId) overdue.where({ exam_round_id: query.examRoundId });
  if (cursor) overdue.where('id', '>', cursor);
  const rows = await overdue;
  if (!rows.length) break;
  for (const row of rows) await attempts.expireOne(row.id, { now: () => time });
  cursor = rows.at(-1).id;
 }
 return db.transaction(async trx => {
  const summary = async round => {
   const [counts] = await trx('attempts').where({ user_id: userId, exam_round_id: round.id, is_trial: 0 })
    .count('* as used').select(trx.raw("COALESCE(SUM(result = 'PASS'), 0) as passed"), trx.raw("COALESCE(SUM(status = 'IN_PROGRESS'), 0) as active"));
   return { examRoundId: round.id, title: round.title, finalResult: finalResult(round, counts, time),
    usedAttempts: Number(counts.used), maxAttempts: Number(round.max_attempts), activeAttempts: Number(counts.active) };
  };
  const pagination = parsePagination(query);
  if (query.examRoundId) {
   const round = await trx('exam_rounds').where({ id: query.examRoundId }).first();
   if (!round || (round.status === 'DRAFT' && !await trx('attempts').where({ user_id: userId, exam_round_id: round.id }).first('id'))) throw httpError(404, 'Không tìm thấy đợt kiểm tra');
   const base = trx('attempts').where({ user_id: userId, exam_round_id: round.id });
   const [{ total }] = await base.clone().count('* as total');
   const rows = await base.clone().orderBy('started_at', 'desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
   return { summary: await summary(round), items: rows.map(historyItem), pagination: buildPagination(pagination, total) };
  }
  const base = trx('exam_rounds').whereIn('status', ['OPEN', 'CLOSED']).orWhereExists(function () {
   this.select(trx.raw('1')).from('attempts').whereRaw('attempts.exam_round_id = exam_rounds.id').where('user_id', userId);
  });
  const [{ total }] = await base.clone().count('* as total');
  const rows = await base.clone().orderBy('created_at', 'desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
  const items = []; for (const round of rows) items.push(await summary(round));
  return { items, pagination: buildPagination(pagination, total) };
 });
};
module.exports = { list };
