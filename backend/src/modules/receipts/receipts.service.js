const db=require('../../config/database');
const attempts=require('../attempts/attempts.service');
const {validateId}=require('../attempts/attempts.validator');
const {httpError}=require('../../utils/http-error');
const {validateLookup}=require('./receipts.validator');
const {ensure,serialize}=require('./receipts.store');
const forAttempt=async(id,userId)=>{
 validateId(id);
 // Chốt lười bằng cơ chế hiện có; không chấm lại kết quả đã chốt.
 await attempts.get(id,userId,{includeResult:true});
 return db.transaction(async trx=>{
  const attempt=await trx('attempts').where({id}).forUpdate().first();
  if(!attempt)throw httpError(404,'Không tìm thấy lượt thi');
  if(attempt.user_id!==userId)throw httpError(403,'Bạn không có quyền truy cập phiếu này');
  if(attempt.status==='IN_PROGRESS')throw httpError(409,'Lượt thi chưa kết thúc');
  return ensure(trx,attempt);
 });
};
const lookup=async body=>{
 const code=validateLookup(body);
 const row=await db('attempt_receipts').where({verification_code:code}).first();
 if(!row)throw httpError(404,'Không tìm thấy phiếu với mã tra cứu này');
 return {receipt:serialize(row),receiptId:row.id};
};
module.exports={forAttempt,lookup};
