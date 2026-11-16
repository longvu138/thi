const array = value => Array.isArray(value) ? value : [];
export const RESULT_LABELS = Object.freeze({ PASSED: 'Đạt', FAILED: 'Không đạt', IN_PROGRESS_ROUND: 'Còn khả năng thi', NOT_STARTED: 'Chưa thi', PASS: 'Đạt', FAIL: 'Không đạt', IN_PROGRESS: 'Đang làm', SUBMITTED: 'Đã nộp', EXPIRED: 'Hết giờ' });
export const resultLabel = value => RESULT_LABELS[value] || 'Chưa có kết quả';
export const normalizeResult = (value,{admin=false}={}) => {
 const row = value || {};
 const ended = ['SUBMITTED', 'EXPIRED'].includes(row.status);
 const reveal = admin || (ended && row.config?.showCorrectAnswers === true);
 return { ...row, config: row.config || {}, questions: array(row.questions).map(question => ({
  id: question?.id, position: question?.position, content: question?.content || '', categoryName: question?.categoryName || '',
  selectedAnswer: question?.selectedAnswer || null,
  ...(reveal && ['A','B','C','D'].includes(question?.correctAnswer) ? { correctAnswer: question.correctAnswer } : {}),
  options: array(question?.options).map(option => ({ key: option?.key, content: option?.content || '' })),
 })) };
};
export const normalizeResults = value => ({
 items: array(value?.items).filter(row => row && typeof row === 'object'), summary: value?.summary || null,
 pagination: { page: 1, limit: 20, total: 0, ...(value?.pagination || {}) },
});
export const durationLabel = value => {const seconds=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(seconds/60)} phút ${seconds%60} giây`;};
