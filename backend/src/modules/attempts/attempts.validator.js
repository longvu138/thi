const { httpError } = require('../../utils/http-error');
const validateId = id => {
 if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw httpError(422, 'Mã định danh không hợp lệ');
 return id;
};
const emptyBody = body => {
 if (body !== undefined && (body === null || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) throw httpError(422, 'Yêu cầu này không nhận thêm dữ liệu');
};
const validateAnswers = (body,{allowEmpty=false,max=500}={}) => {
 if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'answers') || !Array.isArray(body.answers) || (!allowEmpty && !body.answers.length) || body.answers.length > max) throw httpError(422, `Vui lòng gửi ${allowEmpty?'từ 0':'từ 1'} đến ${max} câu trả lời`);
 const seen = new Set();
 return body.answers.map(answer => {
  if (!answer || typeof answer !== 'object' || Object.keys(answer).some(key => !['attemptQuestionId','selectedAnswer'].includes(key))) throw httpError(422, 'Dữ liệu câu trả lời không hợp lệ');
  const id = validateId(answer.attemptQuestionId).toLowerCase();
  if (seen.has(id)) throw httpError(422, 'Không gửi trùng câu trả lời'); seen.add(id);
  if (answer.selectedAnswer !== null && !['A','B','C','D'].includes(answer.selectedAnswer)) throw httpError(422, 'Đáp án phải là A, B, C, D hoặc null để bỏ chọn');
  return { attemptQuestionId: id, selectedAnswer: answer.selectedAnswer };
 });
};
const validateStart = (body = {}) => {
 if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key=>key!=='trialOnly') || (body.trialOnly!==undefined && typeof body.trialOnly!=='boolean')) throw httpError(422,'Yêu cầu bắt đầu lượt không hợp lệ');
 return {trialOnly:body.trialOnly===true};
};
const validateSubmit=(body={})=>{
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='answers'))throw httpError(422,'Dữ liệu nộp bài không hợp lệ');
 return body.answers===undefined?{}:{answers:validateAnswers(body,{allowEmpty:true,max:10000})};
};
module.exports = { validateSubmit, validateId, emptyBody, validateAnswers, validateStart };
