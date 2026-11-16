const { randomInt } = require('node:crypto');
const { httpError } = require('../../utils/http-error');
const { toDate } = require('../../utils/datetime');
const json = value => typeof value === 'string' ? JSON.parse(value) : value;
const shuffle = (items, random = randomInt) => {
 const result = [...items];
 for (let index = result.length - 1; index > 0; index--) { const other = random(index + 1); [result[index], result[other]] = [result[other], result[index]]; }
 return result;
};
const snapshotQuestion = (row, shuffleOptions, random = randomInt) => {
 let options = ['A','B','C','D'].filter(key => row[`option_${key.toLowerCase()}`]?.trim()).map(originalKey => ({ originalKey, content: row[`option_${originalKey.toLowerCase()}`] }));
 if (shuffleOptions && row.allow_shuffle_options) options = shuffle(options, random);
 options = options.map((option, index) => ({ ...option, key: 'ABCD'[index] }));
 return { content: row.content, categoryName: row.category_name, questionCode: row.question_code, options, correctAnswer: options.find(option => option.originalKey === row.correct_answer).key };
};
const grade = (questions, answers, config) => {
 const selections = new Map(answers.map(answer => [answer.attempt_question_id, answer.selected_answer]));
 let correctCount = 0; let unansweredCount = 0;
 for (const question of questions) {
  const selected = selections.get(question.id);
  if (!selected) unansweredCount++;
  else if (selected === question.correct_answer) correctCount++;
 }
 return { correctCount, unansweredCount, incorrectCount: config.questionCount - correctCount - unansweredCount,
  percentage: Number((correctCount * 100 / config.questionCount).toFixed(4)),
  result: correctCount * 100 >= config.passingPercentage * config.questionCount ? 'PASS' : 'FAIL' };
};
const modeFor = (round, now) => {
 if (round.status !== 'OPEN') throw httpError(409, 'Đợt kiểm tra chưa mở hoặc đã đóng');
 const start = toDate(round.start_at)?.getTime(); const end = toDate(round.end_at)?.getTime(); const trial = toDate(round.trial_start_at)?.getTime();
 if (end !== undefined && now >= end) throw httpError(409, 'Đợt kiểm tra đã hết thời gian');
 if (start !== undefined && now < start) {
  if (trial !== undefined && now >= trial) return true;
  throw httpError(409, 'Chưa đến thời gian bắt đầu đợt kiểm tra');
 }
 return false;
};
module.exports = { json, shuffle, snapshotQuestion, grade, modeFor };
