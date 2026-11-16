const validQuestionQuery = (examRoundId, client) => client('questions')[Array.isArray(examRoundId)?'whereIn':'where']('exam_round_id', examRoundId).whereNull('deleted_at')
 .whereRaw("CHAR_LENGTH(TRIM(content)) > 0 AND CHAR_LENGTH(TRIM(option_a)) > 0 AND CHAR_LENGTH(TRIM(option_b)) > 0")
 .whereRaw("(correct_answer IN ('A', 'B') OR (correct_answer = 'C' AND CHAR_LENGTH(TRIM(option_c)) > 0) OR (correct_answer = 'D' AND CHAR_LENGTH(TRIM(option_c)) > 0 AND CHAR_LENGTH(TRIM(option_d)) > 0))")
 .whereRaw("(option_d IS NULL OR TRIM(option_d) = '' OR CHAR_LENGTH(TRIM(option_c)) > 0)");
module.exports = { validQuestionQuery };
