const {loadSummaries,serializeSummary,missingItems}=require('./admin-summary');
const { validQuestionQuery } = require('../../utils/valid-questions-query');
const db = require('../../config/database');
const { createUuid } = require('../../utils/uuid');
const { httpError } = require('../../utils/http-error');
const { parsePagination, buildPagination } = require('../../utils/pagination');
const { containsPattern } = require('../../utils/sql-like');
const { toIsoUtc, toDbDateTime } = require('../../utils/datetime');
const { FIELDS, validateRound, validateId, validateQuery } = require('./exam-rounds.validator');
const {parseSelection,DEFAULT_SELECTION,groupKey}=require('./structure.logic');
const COLUMN_MAP = {
 selectionConfig:'selection_config', title: 'title', description: 'description', questionCount: 'question_count', durationMinutes: 'duration_minutes',
 maxAttempts: 'max_attempts', passingPercentage: 'passing_percentage', stopAfterPass: 'stop_after_pass',
 showCorrectAnswers: 'show_correct_answers', shuffleQuestions: 'shuffle_questions', shuffleOptions: 'shuffle_options',
 trialStartAt: 'trial_start_at', startAt: 'start_at', endAt: 'end_at', status: 'status',
};
const serialize = (row) => ({
 selectionConfig:parseSelection(row.selection_config),id: row.id, title: row.title, description: row.description,
 questionCount: Number(row.question_count), durationMinutes: Number(row.duration_minutes), maxAttempts: Number(row.max_attempts),
 passingPercentage: Number(row.passing_percentage), stopAfterPass: Boolean(row.stop_after_pass),
 showCorrectAnswers: Boolean(row.show_correct_answers), shuffleQuestions: Boolean(row.shuffle_questions), shuffleOptions: Boolean(row.shuffle_options),
 trialStartAt: toIsoUtc(row.trial_start_at), startAt: toIsoUtc(row.start_at), endAt: toIsoUtc(row.end_at), status: row.status,
 createdAt: toIsoUtc(row.created_at), updatedAt: toIsoUtc(row.updated_at),
});
const decorate = async (rows, client, {admin=false,userId}={}) => {
 if(!rows.length)return [];
 const ids=rows.map(row=>row.id);
 if(admin){
  const summaries=await loadSummaries(client,ids);
  const counts=await validQuestionQuery(ids,client).select('exam_round_id',client.raw('BINARY category_name as category_name')).count('* as total').groupBy('exam_round_id').groupByRaw('BINARY category_name');
  const map=new Map();for(const item of counts){if(!map.has(item.exam_round_id))map.set(item.exam_round_id,new Map());const groups=map.get(item.exam_round_id),key=groupKey(String(item.category_name));groups.set(key,(groups.get(key)||0)+Number(item.total));}
  return rows.map(row=>{const config=parseSelection(row.selection_config),groups=map.get(row.id)||new Map();const selected=config.mode==='BY_GROUP'?config.groups.filter(g=>g.count>0):null;
   const total=selected?selected.reduce((sum,g)=>sum+(groups.get(groupKey(g.category))||0),0):[...groups.values()].reduce((sum,n)=>sum+n,0);
   const value={...serialize(row),summary:summaries.get(row.id)||serializeSummary(),totalValidQuestionCount:[...groups.values()].reduce((sum,n)=>sum+n,0),groupCount:groups.size,validQuestionCount:total,structureSufficient:selected?selected.length>0&&selected.every(g=>(groups.get(groupKey(g.category))||0)>=g.count):total>=Number(row.question_count)};
   return {...value,missing:missingItems(value)};
  });
 }
 if(!userId)return rows.map(serialize);
 const counts=await client('attempts').where({user_id:userId}).whereIn('exam_round_id',ids).groupBy('exam_round_id','is_trial').select('exam_round_id','is_trial').count('* as used').max('attempt_number as last')
 .select(client.raw("SUM(result = 'PASS') as passed"),client.raw("SUM(status = 'IN_PROGRESS') as active"),client.raw("MAX(CASE WHEN status = 'IN_PROGRESS' THEN id END) as active_id"),client.raw("MAX(CASE WHEN status = 'IN_PROGRESS' THEN attempt_number END) as active_number"));
 const {participation}=require('./participation.logic');
 return rows.map(row=>{const own=counts.filter(item=>item.exam_round_id===row.id);const active=own.find(item=>item.active_id);return {...serialize(row),participation:participation(row,own.find(item=>!Number(item.is_trial)),own.find(item=>Number(item.is_trial)),active?{id:active.active_id,isTrial:Boolean(active.is_trial),attemptNumber:Number(active.active_number)}:null)};});
};
const expireOwned = async (userId,roundId) => {
 if(!userId)return;let cursor;const now=Date.now();
 while(true){const query=db('attempts').where({user_id:userId,status:'IN_PROGRESS'}).where('expires_at','<=',new Date(now)).orderBy('id').limit(100).select('id');if(roundId)query.where({exam_round_id:roundId});if(cursor)query.where('id','>',cursor);const rows=await query;if(!rows.length)break;for(const row of rows)await require('../attempts/attempts.service').expireOne(row.id,{now:()=>now});cursor=rows.at(-1).id;}
};
const get = async (id, { client = db, admin = false, userId } = {}) => {
 validateId(id);
 if(!admin&&client===db)await expireOwned(userId,id);
 const query = client('exam_rounds').where({ id });
 if (!admin) query.whereIn('status', ['OPEN', 'CLOSED']);
 const row = await query.first();
 if (!row) throw httpError(404, 'Không tìm thấy đợt kiểm tra');
 return (await decorate([row],client,{admin,userId}))[0];
};
const list = async (query = {}, { admin = false, userId } = {}) => {
 validateQuery(query); if(!admin)await expireOwned(userId); const pagination = parsePagination(query);
 const base = db('exam_rounds');
 if (!admin) base.whereIn('status', ['OPEN', 'CLOSED']);
 if (query.search) base.where('title', 'like', containsPattern(query.search));
 const statusRows=admin?await base.clone().select('status').count('* as total').groupBy('status'):[];
 const statusCounts=Object.fromEntries(['OPEN','DRAFT','CLOSED'].map(status=>[status,Number(statusRows.find(row=>row.status===status)?.total||0)]));
 if (query.status) base.where({ status: query.status });
 const [{ total }] = await base.clone().count('* as total');
 const ordered=base.clone();
 if(!admin){const now=new Date();if(userId)ordered.orderByRaw("CASE WHEN EXISTS (SELECT 1 FROM attempts a WHERE a.exam_round_id = exam_rounds.id AND a.user_id = ? AND a.status = 'IN_PROGRESS') THEN 0 WHEN status = 'OPEN' AND (end_at IS NULL OR end_at > ?) AND (start_at IS NULL OR start_at <= ? OR trial_start_at <= ?) THEN 1 WHEN status = 'OPEN' AND (end_at IS NULL OR end_at > ?) THEN 2 ELSE 3 END",[userId,now,now,now,now]);}
 const rows = await ordered.orderBy('created_at', 'desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
 return { items: await decorate(rows,db,{admin,userId}), pagination: buildPagination(pagination, total),...(admin?{statusCounts}:{}) };
};
const assertConfiguration=async(id,data,trx)=>{if(data.status==='OPEN')await require('./structure.service').assertCapacity(trx,{id,question_count:data.questionCount,selection_config:data.selectionConfig});};
const toRow = data => Object.fromEntries(Object.entries(COLUMN_MAP).map(([key, column]) => [column, key==='selectionConfig'?JSON.stringify(data[key]):['trialStartAt', 'startAt', 'endAt'].includes(key) ? toDbDateTime(data[key]) : data[key]]));
const create = async body => {
 const data = {...validateRound(body),questionCount:20,selectionConfig:DEFAULT_SELECTION};
 return db.transaction(async trx => {
  const id = createUuid();
  await assertConfiguration(id, data, trx); await trx('exam_rounds').insert({ id, ...toRow(data) });
  return get(id, { client: trx, admin: true });
 });
};
const update = async (id, body) => {
 validateId(id); const patch = validateRound(body, { partial: true });
 return db.transaction(async trx => {
  const locked = await trx('exam_rounds').where({ id }).forUpdate().first();
  if (!locked) throw httpError(404, 'Không tìm thấy đợt kiểm tra');
  const before = await get(id, { client: trx, admin: true });
  const current = Object.fromEntries(FIELDS.map(key => [key, before[key]]));
  const data = {...validateRound({ ...current, ...patch }),questionCount:before.questionCount,selectionConfig:before.selectionConfig};
  await assertConfiguration(id, data, trx);
  // Không cập nhật attempts hoặc attempt_questions: snapshot đã tạo luôn giữ nguyên.
  await trx('exam_rounds').where({ id }).update({ ...toRow(data), updated_at: trx.fn.now() });
  return { before, after: await get(id, { client: trx, admin: true }) };
 });
};
const remove = async id => {
 validateId(id);
 return db.transaction(async trx => {
  const row = await trx('exam_rounds').where({ id }).forUpdate().first();
  if (!row) throw httpError(404, 'Không tìm thấy đợt kiểm tra');
  if (await trx('attempts').where({ exam_round_id: id }).first('id')) throw httpError(409, 'Không thể xóa đợt đã có lượt thi; hãy chuyển sang trạng thái Đã đóng');
  const before = await get(id, { client: trx, admin: true });
  await trx('questions').where({ exam_round_id: id }).delete();
  await trx('exam_rounds').where({ id }).delete();
  return before;
 });
};
// Cổng công khai chỉ công bố đợt đang trong thời gian thi/chạy thử, không có dữ liệu người/câu hỏi.
const publicList = async (query = {}) => {
 if(Object.keys(query).some(key=>!['page','limit'].includes(key))) throw httpError(422,'Bộ lọc đợt công khai không hợp lệ');
 const pagination=parsePagination(query),now=new Date();
 const base=db('exam_rounds').where({status:'OPEN'}).where(builder=>builder.whereNull('end_at').orWhere('end_at','>',now))
 .where(builder=>builder.whereNull('start_at').orWhere('start_at','<=',now).orWhere('trial_start_at','<=',now));
 const [{total}]=await base.clone().count('* as total');
 const rows=await base.clone().select('id','title','question_count','duration_minutes','start_at','end_at','trial_start_at').orderBy('end_at').orderBy('id').limit(pagination.limit).offset(pagination.offset);
 return {items:rows.map(row=>({id:row.id,title:row.title,questionCount:Number(row.question_count),durationMinutes:Number(row.duration_minutes),startAt:toIsoUtc(row.start_at),endAt:toIsoUtc(row.end_at),trialStartAt:toIsoUtc(row.trial_start_at),status:'OPEN'})),pagination:buildPagination(pagination,total)};
};
module.exports = { list, get, create, update, remove, publicList };
