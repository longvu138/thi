const db = require('../../config/database');
const { createUuid } = require('../../utils/uuid');
const { httpError } = require('../../utils/http-error');
const { toIsoUtc, toDate, toDbDateTime } = require('../../utils/datetime');
const {selectQuestions}=require('../exam-rounds/structure.selection');
const {parseSelection}=require('../exam-rounds/structure.logic');
const { json, snapshotQuestion, grade, modeFor } = require('./attempts.logic');
const { validateId, validateAnswers, validateSubmit } = require('./attempts.validator');
const GRACE_MS = 3000;
const fail = (status, message, code) => ({ error: httpError(status, message, code) });
const transaction = async callback => {
 const value = await db.transaction(callback);
 if (value?.error) throw value.error; // Chốt hết giờ vẫn commit trước khi trả 409.
 return value;
};
const deadline = row => {
 const expires = toDate(row.expires_at).getTime(); const config = json(row.config_snapshot);
 return row.is_trial && config.trialEndsAt ? Math.min(expires + GRACE_MS, Date.parse(config.trialEndsAt)) : expires + GRACE_MS;
};
const expired = (row, now) => row.status === 'IN_PROGRESS' && now >= deadline(row);
const finalizeLocked = async (trx, row, now, status) => {
 if (row.status !== 'IN_PROGRESS') return row;
 const questions = await trx('attempt_questions').where({ attempt_id: row.id }).select('id', 'correct_answer');
 const answers = await trx('attempt_answers').where({ attempt_id: row.id }).select('attempt_question_id', 'selected_answer');
 const config = json(row.config_snapshot); const score = grade(questions, answers, config);
 const effectiveEnd = Math.min(now, toDate(row.expires_at).getTime());
 const changes = { status, in_progress_flag: null, correct_count: score.correctCount, incorrect_count: score.incorrectCount,
  unanswered_count: score.unansweredCount, percentage: score.percentage, result: score.result,
  submitted_at: toDbDateTime(new Date(status === 'EXPIRED' ? effectiveEnd : now)),
  duration_seconds: Math.max(0, Math.floor((effectiveEnd - toDate(row.started_at).getTime()) / 1000)) };
 await trx('attempts').where({ id: row.id, status: 'IN_PROGRESS' }).update(changes);
 const ended={...row,...changes};
 await require('../receipts/receipts.store').ensure(trx,ended);
 return ended;
};
const serialize = async (trx, row, now, includeResult = false, admin = false) => {
 const config = json(row.config_snapshot);
 const questions = await trx('attempt_questions').where({ attempt_id: row.id }).orderBy('position');
 const answers = await trx('attempt_answers').where({ attempt_id: row.id }).select('attempt_question_id', 'selected_answer','updated_at');
 const updated=new Map(answers.map(a=>[a.attempt_question_id,toIsoUtc(a.updated_at)]));
 const selected = new Map(answers.map(answer => [answer.attempt_question_id, answer.selected_answer]));
 const result = { id: row.id, examRoundId: row.exam_round_id, title: config.title, attemptNumber: Number(row.attempt_number), isTrial: Boolean(row.is_trial), status: row.status,
  startedAt: toIsoUtc(row.started_at), expiresAt: toIsoUtc(row.expires_at), serverTime: toIsoUtc(new Date(now)),
  remainingSeconds: row.status === 'IN_PROGRESS' ? Math.max(0, Math.ceil((toDate(row.expires_at).getTime() - now) / 1000)) : 0,
  config: { questionCount: config.questionCount, durationMinutes: config.durationMinutes, passingPercentage: config.passingPercentage,
   showCorrectAnswers: config.showCorrectAnswers, shuffleQuestions: config.shuffleQuestions, shuffleOptions: config.shuffleOptions },
  questions: questions.map(question => ({ id: question.id, position: Number(question.position), categoryName: question.category_name, questionCode: question.question_code,
   content: question.content, options: json(question.options_snapshot).map(option => ({ key: option.key, content: option.content })), selectedAnswer: selected.get(question.id) || null, answerUpdatedAt:updated.get(question.id)||null,
   ...(admin || (includeResult && row.status !== 'IN_PROGRESS' && config.showCorrectAnswers === true) ? { correctAnswer: question.correct_answer } : {}) })) };
 if (row.status !== 'IN_PROGRESS') {
  const receipt=await trx('attempt_receipts').where({attempt_id:row.id}).first('verification_code');
  result.receiptCode=receipt?.verification_code||null;
 }
 if (row.status !== 'IN_PROGRESS') Object.assign(result, { submittedAt: toIsoUtc(row.submitted_at), correctCount: Number(row.correct_count), incorrectCount: Number(row.incorrect_count),
  unansweredCount: Number(row.unanswered_count), percentage: Number(row.percentage), result: row.result, durationSeconds: Number(row.duration_seconds) });
 return result;
};
const start = async (roundId, userId, { now = Date.now, trialOnly = false } = {}) => {
 validateId(roundId);
 try { return await transaction(async trx => {
  const user = await trx('users').where({ id: userId }).forUpdate().first();
  if (!user || !user.is_active || user.deleted_at) return fail(403, 'Người dự thi không còn được phép truy cập');
  const round = await trx('exam_rounds').where({ id: roundId }).forUpdate().first();
  if (!round || round.status === 'DRAFT') return fail(404, 'Không tìm thấy đợt kiểm tra');
  const time = now();
  if(trialOnly){try{if(!modeFor(round,time))return fail(409,'Chỉ được bắt đầu khi đợt đang chạy thử');}catch(error){return {error};}}
  let active = await trx('attempts').where({ user_id: userId, exam_round_id: roundId, status: 'IN_PROGRESS' }).forUpdate().first();
  if (active && expired(active, time)) active = await finalizeLocked(trx, active, time, 'EXPIRED');
  if (active?.status === 'IN_PROGRESS') return { created: false, attempt: await serialize(trx, active, time) };
  let trial; try { trial = modeFor(round, time); } catch (error) { return { error }; }
  const used = trx('attempts').where({ user_id: userId, exam_round_id: roundId, is_trial: Number(trial) });
  const [{ total, last }] = await used.clone().count('* as total').max('attempt_number as last');
  if (Number(total) >= round.max_attempts) return fail(409, 'Đã sử dụng hết số lượt của đợt kiểm tra');
  if (round.stop_after_pass && await used.clone().where({ result: 'PASS' }).first('id')) return fail(409, 'Bạn đã đạt yêu cầu, không thể tạo lượt mới');
  let chosen;const selection=parseSelection(round.selection_config);
  try{chosen=await selectQuestions(trx,round);}catch(error){return {error};}
  const expiresAt = Math.min(time + Number(round.duration_minutes) * 60000, toDate(round.end_at)?.getTime() ?? Infinity,
   trial ? toDate(round.start_at).getTime() : Infinity);
  const config = { selectionConfig:selection,title: round.title, participant: {fullName:user.full_name,partyCommittee:user.party_committee||'',partyBranch:user.party_branch||''}, questionCount: Number(round.question_count), durationMinutes: Number(round.duration_minutes),
   passingPercentage: Number(round.passing_percentage), maxAttempts: Number(round.max_attempts), stopAfterPass: Boolean(round.stop_after_pass),
   showCorrectAnswers: Boolean(round.show_correct_answers), shuffleQuestions: Boolean(round.shuffle_questions), shuffleOptions: Boolean(round.shuffle_options),
   trialEndsAt: trial ? toIsoUtc(round.start_at) : null };
  const row = { id: createUuid(), user_id: userId, exam_round_id: roundId, is_trial: Number(trial), attempt_number: Number(last || 0) + 1,
   started_at: toDbDateTime(new Date(time)), expires_at: toDbDateTime(new Date(expiresAt)), status: 'IN_PROGRESS', in_progress_flag: 1, config_snapshot: JSON.stringify(config) };
  await trx('attempts').insert(row);
  const snapshots = chosen.map((question, index) => {
   const snap = snapshotQuestion(question, round.shuffle_options);
   return { id: createUuid(), attempt_id: row.id, question_id: question.id, category_name: snap.categoryName, question_code: snap.questionCode,
    position: index + 1, content: snap.content, options_snapshot: JSON.stringify(snap.options), correct_answer: snap.correctAnswer };
  });
  for (let index = 0; index < snapshots.length; index += 100) await trx('attempt_questions').insert(snapshots.slice(index, index + 100));
  return { created: true, attempt: await serialize(trx, row, time) };
 }); } catch (error) {
  if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
   const active = await db('attempts').where({ user_id: userId, exam_round_id: roundId, status: 'IN_PROGRESS' }).first('id');
   if (active) return { created: false, attempt: await get(active.id, userId, { now }) };
   throw httpError(409, 'Số lượt đã thay đổi, vui lòng tải lại đợt kiểm tra');
  }
  if (['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw httpError(409, 'Đợt kiểm tra đang được cập nhật, vui lòng thử lại');
  throw error;
 }
};
const ownedLocked = async (trx, id, userId) => {
 const row = await trx('attempts').where({ id }).forUpdate().first();
 if (!row) return fail(404, 'Không tìm thấy lượt thi');
 if (row.user_id !== userId) return fail(403, 'Bạn không có quyền truy cập lượt thi này');
 return row;
};
const get = async (id, userId, { now = Date.now, includeResult = false } = {}) => {
 validateId(id);
 return transaction(async trx => {
  let row = await ownedLocked(trx, id, userId); if (row.error) return row;
  const time = now(); if (expired(row, time)) row = await finalizeLocked(trx, row, time, 'EXPIRED');
  if (includeResult && row.status === 'IN_PROGRESS') return fail(409, 'Lượt thi chưa kết thúc, chưa có kết quả');
  return serialize(trx, row, time, includeResult);
 });
};
const writeAnswers=async(trx,id,answers)=>{
  const questions = await trx('attempt_questions').where({ attempt_id: id }).whereIn('id', answers.map(answer => answer.attemptQuestionId)).select('id','options_snapshot');
  const byId = new Map(questions.map(question => [question.id, question]));
  for (const answer of answers) {
   const question = byId.get(answer.attemptQuestionId);
   if (!question || (answer.selectedAnswer !== null && !json(question.options_snapshot).some(option => option.key === answer.selectedAnswer))) throw httpError(422, 'Câu hỏi hoặc lựa chọn không thuộc đề thi này');
  }
  for (const answer of answers) await trx('attempt_answers').insert({ id: createUuid(), attempt_id: id, attempt_question_id: answer.attemptQuestionId, selected_answer: answer.selectedAnswer })
   .onConflict(['attempt_id','attempt_question_id']).merge({ selected_answer: answer.selectedAnswer, updated_at: trx.fn.now() });
};
const saveAnswers = async (id, userId, body, { now = Date.now } = {}) => {
 validateId(id); const answers = validateAnswers(body);
 return transaction(async trx => {
  let row = await ownedLocked(trx, id, userId); if (row.error) return row;
  const time = now(); if (expired(row, time)) row = await finalizeLocked(trx, row, time, 'EXPIRED');
  if (row.status !== 'IN_PROGRESS') return fail(409, 'Lượt thi đã kết thúc, không thể sửa câu trả lời');
  await writeAnswers(trx,id,answers);
  return { id, savedCount: answers.length, serverTime: toIsoUtc(new Date(time)) };
 });
};
const submit = async (id, userId, { now = Date.now,answers:input } = {}) => {
 validateId(id);const {answers}=validateSubmit(input===undefined?{}:{answers:input});
 return transaction(async trx => {
  let row = await ownedLocked(trx, id, userId); if (row.error) return row;
  const time = now();
  if(expired(row,time))row=await finalizeLocked(trx,row,time,'EXPIRED');
  if(row.status==='EXPIRED')return fail(409,'Lượt thi đã hết giờ, các đáp án gửi muộn không được ghi nhận','ATTEMPT_EXPIRED');
  if(row.status==='IN_PROGRESS'){if(answers)await writeAnswers(trx,id,answers);row=await finalizeLocked(trx,row,time,'SUBMITTED');}
  return serialize(trx, row, time);
 });
};
const expireOne = async (id, { now = Date.now } = {}) => db.transaction(async trx => {
 const row = await trx('attempts').where({ id }).forUpdate().first();
 if (row && expired(row, now())) { await finalizeLocked(trx, row, now(), 'EXPIRED'); return true; }
 return false;
});
const expireBatch = async ({ now = Date.now, batchSize = 100 } = {}) => {
 const time = now(); const limit = Math.max(1, Math.min(100, Math.floor(Number(batchSize) || 100)));
 const rows = await db('attempts').where({ status: 'IN_PROGRESS' }).where('expires_at', '<=', new Date(time - GRACE_MS)).orderBy('expires_at').limit(limit).select('id');
 let count = 0; for (const row of rows) if (await expireOne(row.id, { now: () => time })) count++;
 return count;
};
const clearTrialData = async roundId => {
 validateId(roundId);
 return db.transaction(async trx => {
  const round = await trx('exam_rounds').where({ id: roundId }).forUpdate().first();
  if (!round) throw httpError(404, 'Không tìm thấy đợt kiểm tra');
  let deletedCount = 0;
  while (true) {
   const trials = await trx('attempts').where({ exam_round_id: roundId, is_trial: 1 }).orderBy('id').limit(100).forUpdate().select('id');
   if (!trials.length) break;
   const ids = trials.map(row => row.id);
   await trx('attempt_receipts').whereIn('attempt_id', ids).delete();
   await trx('attempt_answers').whereIn('attempt_id', ids).delete();
   await trx('attempt_questions').whereIn('attempt_id', ids).delete();
   await trx('attempts').whereIn('id', ids).where({ is_trial: 1 }).delete();
   deletedCount += ids.length;
  }
  return { deletedCount };
 });
};
const getForAdmin=async id=>{
 validateId(id);
 return db.transaction(async trx=>{const row=await trx('attempts').where({id}).first();if(!row)throw httpError(404,'Không tìm thấy lượt thi');return serialize(trx,row,Date.now(),true,true);},{isolationLevel:'repeatable read'});
};
module.exports = { getForAdmin, start, get, saveAnswers, submit, expireOne, expireBatch, clearTrialData, GRACE_MS };
