const crypto=require('node:crypto');
const {normalizeCode}=require('./receipts.validator');
const {toIsoUtc}=require('../../utils/datetime');
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode=()=>Array.from({length:6},()=>CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
const snapshot=(attempt,config,participant)=>({
 title:config.title||'Kiểm tra nhận thức',fullName:participant.fullName||'',partyCommittee:participant.partyCommittee||'',partyBranch:participant.partyBranch||'',
 attemptNumber:Number(attempt.attempt_number),isTrial:Boolean(attempt.is_trial),status:attempt.status,
 questionCount:Number(config.questionCount),correctCount:Number(attempt.correct_count),incorrectCount:Number(attempt.incorrect_count),unansweredCount:Number(attempt.unanswered_count),
 // Câu bỏ trống tính sai trên phiếu, vẫn giữ số bỏ trống riêng để đối chiếu.
 wrongCount:Number(attempt.incorrect_count)+Number(attempt.unanswered_count),
 score10:Number((Number(attempt.correct_count)*10/Number(config.questionCount)).toFixed(2)),
 percentage:Number(attempt.percentage),passingPercentage:Number(config.passingPercentage),result:attempt.result,
 durationSeconds:Number(attempt.duration_seconds),submittedAt:toIsoUtc(attempt.submitted_at),
});
module.exports={makeCode,normalizeCode,snapshot};
