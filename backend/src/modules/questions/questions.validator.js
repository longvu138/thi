const { httpError } = require('../../utils/http-error');
const { requireFields } = require('../../utils/validation');
const FIELDS = ['questionCode','category','content','optionA','optionB','optionC','optionD','correctAnswer','allowShuffleOptions'];
const validateQuestion = (body, {partial = false} = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(422,'Dữ liệu câu hỏi không hợp lệ');
  if (Object.keys(body).some(key => !FIELDS.includes(key))) throw httpError(422,'Trường dữ liệu câu hỏi không hợp lệ');
  const data = {};
  for (const key of FIELDS.filter(key => key !== 'allowShuffleOptions')) {
    if (partial && body[key] === undefined) continue;
    if (body[key] != null && typeof body[key] !== 'string') throw httpError(422,`${key}: giá trị phải là văn bản`);
    data[key] = (body[key] || '').trim();
  }
  if (!partial) {
    const missing = requireFields(data,{questionCode:'Mã câu hỏi',category:'Nhóm',content:'Nội dung',optionA:'Lựa chọn A',optionB:'Lựa chọn B',correctAnswer:'Đáp án đúng'});
    if (missing) throw httpError(422,missing.error);
    for (const [key,max,label] of [['questionCode',100,'Mã câu hỏi'],['category',255,'Nhóm'],['content',15000,'Nội dung'],['optionA',15000,'Lựa chọn A'],['optionB',15000,'Lựa chọn B'],['optionC',15000,'Lựa chọn C'],['optionD',15000,'Lựa chọn D']]) {
      if (data[key].length > max) throw httpError(422,`${label} không được quá ${max} ký tự`);
    }
    if (!['A','B','C','D'].includes(data.correctAnswer)) throw httpError(422,'Đáp án đúng phải là A, B, C hoặc D');
    if (!data[`option${data.correctAnswer}`]) throw httpError(422,'Đáp án đúng phải trỏ tới lựa chọn có nội dung');
    if (data.optionD && !data.optionC) throw httpError(422,'Phải có lựa chọn C trước khi thêm lựa chọn D');
  }
  if (body.allowShuffleOptions !== undefined && typeof body.allowShuffleOptions !== 'boolean') throw httpError(422,'Cho phép xáo trộn phải là true hoặc false');
  if (!partial || body.allowShuffleOptions !== undefined) data.allowShuffleOptions = body.allowShuffleOptions ?? true;
  if (partial && !Object.keys(data).length) throw httpError(422,'Vui lòng cung cấp thông tin cần sửa');
  return data;
};
const validateId = id => {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw httpError(422,'Mã định danh không hợp lệ');
  return id;
};
const validateQuery = (query = {}) => {
  if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 255)) throw httpError(422,'Từ khóa tìm kiếm không hợp lệ');
  if (query.category !== undefined && (typeof query.category !== 'string' || query.category.length > 255)) throw httpError(422,'Nhóm câu hỏi không hợp lệ');
  return query;
};
module.exports = {validateQuestion,validateId,validateQuery};
