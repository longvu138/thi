const db = require('../../config/database');
const { createUuid } = require('../../utils/uuid');
const { httpError } = require('../../utils/http-error');
const { parsePagination, buildPagination } = require('../../utils/pagination');
const { containsPattern } = require('../../utils/sql-like');
const { toIsoUtc } = require('../../utils/datetime');
const { validQuestionQuery } = require('../../utils/valid-questions-query');
const {validateQuestion,validateId,validateQuery} = require('./questions.validator');
const serialize = row => ({id:row.id,examRoundId:row.exam_round_id,questionCode:row.question_code,category:row.category_name,content:row.content,optionA:row.option_a,optionB:row.option_b,optionC:row.option_c || '',optionD:row.option_d || '',correctAnswer:row.correct_answer,allowShuffleOptions:Boolean(row.allow_shuffle_options),createdAt:toIsoUtc(row.created_at),updatedAt:toIsoUtc(row.updated_at)});
const round = async (roundId, client = db, lock = false) => {
 validateId(roundId);
 const query = client('exam_rounds').where({id:roundId});
 if (lock) query.forUpdate();
 const row = await query.first();
 if (!row) throw httpError(404,'Không tìm thấy đợt kiểm tra');
 return row;
};
const baseQuery = (roundId, client) => client('questions').where({exam_round_id:roundId}).whereNull('deleted_at');
const get = async (roundId, id, client = db) => {
 validateId(id); await round(roundId, client);
 const row = await baseQuery(roundId,client).where({id}).first();
 if (!row) throw httpError(404,'Không tìm thấy câu hỏi trong đợt');
 return serialize(row);
};
const list = async (roundId, query = {}) => {
 await round(roundId); validateQuery(query); const pagination = parsePagination(query);
 const base = baseQuery(roundId,db);
 if (query.search) base.where(function () {this.where('question_code','like',containsPattern(query.search)).orWhere('content','like',containsPattern(query.search));});
 if (query.category) base.where('category_name',query.category);
 const [{total}] = await base.clone().count('* as total');
 const [{total:validCount}] = await validQuestionQuery(roundId,db).count('* as total');
 const rows = await base.clone().orderBy('created_at','desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
 return {items:rows.map(serialize),validCount:Number(validCount),pagination:buildPagination(pagination,total)};
};
const categories = async (roundId, query = {}) => {
 await round(roundId); validateQuery(query); const pagination = parsePagination(query);
 const base = baseQuery(roundId,db);
 if (query.search) base.where('category_name','like',containsPattern(query.search));
 const [{total}] = await base.clone().countDistinct('category_name as total');
 const rows = await base.clone().distinct('category_name').orderBy('category_name').limit(pagination.limit).offset(pagination.offset);
 return {items:rows.map(row=>({id:row.category_name,name:row.category_name})),pagination:buildPagination(pagination,total)};
};
const rowFrom = data => ({question_code:data.questionCode,category_name:data.category,content:data.content,option_a:data.optionA,option_b:data.optionB,option_c:data.optionC || null,option_d:data.optionD || null,correct_answer:data.correctAnswer,allow_shuffle_options:data.allowShuffleOptions});
const insert = async (roundId,data,trx) => {
 const id = createUuid();
 await trx('questions').insert({id,exam_round_id:roundId,...rowFrom(data)});
 return id;
};
const rethrow = error => {
 if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) throw httpError(409,'Mã câu hỏi đã được sử dụng trong đợt (kể cả câu đã vô hiệu hóa)');
 if (['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw httpError(409,'Câu hỏi của đợt đang thay đổi, vui lòng xem trước hoặc thử lại');
 throw error;
};
const create = async (roundId,body) => {
 const data = validateQuestion(body);
 try { return await db.transaction(async trx => {await round(roundId,trx,true);return get(roundId,await insert(roundId,data,trx),trx);}); } catch(error) {rethrow(error);}
};
const update = async (roundId,id,body) => {
 validateId(id); const patch = validateQuestion(body,{partial:true});
 try {return await db.transaction(async trx => {
  const examRound=await round(roundId,trx,true);
  const before = await get(roundId,id,trx);
  const data = validateQuestion(Object.fromEntries(['questionCode','category','content','optionA','optionB','optionC','optionD','correctAnswer','allowShuffleOptions'].map(key => [key,patch[key] ?? before[key]])));
  await trx('questions').where({id,exam_round_id:roundId}).update({...rowFrom(data),updated_at:trx.fn.now()});
  if(examRound.status==='OPEN')await require('../exam-rounds/structure.service').assertCapacity(trx,examRound);
  return {before,after:await get(roundId,id,trx)};
 });} catch(error) {rethrow(error);}
};
const remove = async (roundId,id) => {
 validateId(id);
 return db.transaction(async trx => {
  const examRound = await round(roundId,trx,true);
  const before = await get(roundId,id,trx);
  if (examRound.status === 'OPEN') {
   const [{total}] = await validQuestionQuery(roundId,trx).whereNot('id',id).count('* as total');
   if (Number(total) < examRound.question_count) throw httpError(409,'Không thể vô hiệu hóa hoặc xóa câu làm đợt đang mở thiếu câu hỏi hợp lệ');
  }
  const used = await trx('attempt_questions').where({question_id:id}).first('id');
  if (used) await trx('questions').where({id}).update({deleted_at:trx.fn.now(),updated_at:trx.fn.now()});
  else await trx('questions').where({id}).delete();
  if(examRound.status==='OPEN')await require('../exam-rounds/structure.service').assertCapacity(trx,examRound);
  return {...before,deletionMode:used?'disabled':'deleted'};
 });
};
module.exports = {get,list,categories,create,update,remove,insert,rethrow,round};
