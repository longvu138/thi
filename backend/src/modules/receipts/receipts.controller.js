const service=require('./receipts.service');
const {auditLog}=require('../../utils/audit-log');
exports.get=async(req,res,next)=>{try{
 const receipt=await service.forAttempt(req.params.id,req.user.id);
 auditLog(req,'info',{event:'attempt_receipt_viewed',attemptId:req.params.id});
 res.set('Cache-Control','no-store').json(receipt);
}catch(error){next(error);}};
exports.lookup=async(req,res,next)=>{try{
 const result=await service.lookup(req.body);
 auditLog(req,'info',{event:'attempt_receipt_looked_up',receiptId:result.receiptId});
 res.json(result.receipt);
}catch(error){next(error);}};
