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
exports.adminList=async(req,res,next)=>{try{
 const data=await service.adminList(req.query);
 auditLog(req,'info',{event:'admin_receipts_listed',filteredByCode:Boolean(req.query.code)});
 res.json(data);
}catch(error){next(error);}};
exports.adminGet=async(req,res,next)=>{try{
 const receipt=await service.adminGet(req.params.id);
 auditLog(req,'info',{event:'admin_receipt_viewed',attemptId:req.params.id});res.json(receipt);
}catch(error){next(error);}};
