const db=require('../../config/database');
const {validateHistory}=require('./attempts.admin.validator');
const {httpError}=require('../../utils/http-error');
const {parsePagination,buildPagination}=require('../../utils/pagination');
const {toIsoUtc}=require('../../utils/datetime');
const history=async(roundId,userId,query={})=>{
 validateHistory(roundId,userId,query);const pagination=parsePagination(query);
 return db.transaction(async trx=>{
  if(!await trx('exam_rounds').where({id:roundId}).first('id'))throw httpError(404,'Không tìm thấy đợt kiểm tra');
  const user=await trx('users').where({id:userId}).first();if(!user)throw httpError(404,'Không tìm thấy người dự thi');
  const base=trx('attempts').where({exam_round_id:roundId,user_id:userId});const [{total}]=await base.clone().count('* as total');
  const rows=await base.clone().orderBy('started_at','desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
  return {participant:{id:user.id,fullName:user.full_name,partyCommittee:user.party_committee||'',partyBranch:user.party_branch||''},items:rows.map(row=>({id:row.id,attemptNumber:Number(row.attempt_number),isTrial:Boolean(row.is_trial),status:row.status,correctCount:row.correct_count,percentage:row.percentage===null?null:Number(row.percentage),result:row.result,startedAt:toIsoUtc(row.started_at),submittedAt:toIsoUtc(row.submitted_at),durationSeconds:row.duration_seconds})),pagination:buildPagination(pagination,total)};
 },{isolationLevel:'repeatable read'});
};
module.exports={history};
