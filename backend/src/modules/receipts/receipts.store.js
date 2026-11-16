const {createUuid}=require('../../utils/uuid');
const {makeCode,snapshot}=require('./receipts.logic');
const {auditLog}=require('../../utils/audit-log');
const parse=value=>typeof value==='string'?JSON.parse(value):value;
const serialize=row=>({...parse(row.data_snapshot),verificationCode:row.verification_code});
// Người gọi đã khóa dòng attempt. Cả submit, job và API phiếu dùng cùng khóa này.
const ensure=async(trx,attempt)=>{
 const existing=await trx('attempt_receipts').where({attempt_id:attempt.id}).first();
 if(existing)return serialize(existing);
 const config=parse(attempt.config_snapshot);
 let participant=config.participant;
 if(!participant){
  const user=await trx('users').where({id:attempt.user_id}).first();
  participant={fullName:user?.full_name,partyCommittee:user?.party_committee,partyBranch:user?.party_branch};
 }
 const data=snapshot(attempt,config,participant);
 for(let retry=0;retry<3;retry++){
  const row={id:createUuid(),attempt_id:attempt.id,verification_code:makeCode(),data_snapshot:JSON.stringify(data)};
  try{
   await trx('attempt_receipts').insert(row);
   auditLog({method:'SYSTEM',originalUrl:'attempt-receipt',user:{id:attempt.user_id}},'info',{event:'attempt_receipt_created',attemptId:attempt.id,receiptId:row.id,isTrial:data.isTrial});
   return serialize(row);
  }catch(error){if(error.code!=='ER_DUP_ENTRY'||retry===2)throw error;}
 }
};
module.exports={ensure,serialize};
