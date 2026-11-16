const service=require('./reports.service');
const excel=require('./reports.excel');
const {validate}=require('./reports.validator');
const {auditLog}=require('../../utils/audit-log');
const logger=require('../../utils/logger');
for(const [name,handler] of Object.entries({results:service.results,statistics:service.stats,questions:service.questions,committees:service.committees}))exports[name]=async(req,res,next)=>{
 try{res.set('Cache-Control','no-store').json(await handler(req.params.id,req.query));}catch(error){next(error);}
};
exports.export=async(req,res,next)=>{
 try{
  validate(req.params.id,req.query);
  // Xác minh đợt trước khi ghi header/bắt đầu stream Excel.
  await service.read(req.params.id,req.query,async()=>undefined);
  res.set({'Cache-Control':'no-store','Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="bao-cao-${req.params.id}.xlsx"`});
  const result=await excel.write(req.params.id,req.query,res);
  auditLog(req,'info',{event:'exam_round_report_exported',examRoundId:req.params.id,...result});
 }catch(error){if(res.headersSent){logger.error({event:'exam_round_report_export_failed',requestId:req.requestId,actorUserId:req.user?.id,examRoundId:req.params.id,message:error.message,stack:error.stack});res.destroy(error);}else next(error);}
};
