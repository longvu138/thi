const service=require('./questions.service');
const {importQuestions}=require('./questions.import.service');
const {template}=require('./questions.excel');
const {auditLog}=require('../../utils/audit-log');
exports.list=async(req,res,next)=>{try {res.json(await service.list(req.params.id,req.query));} catch(error){next(error);}};
exports.categories=async(req,res,next)=>{try {res.json(await service.categories(req.params.id,req.query));} catch(error){next(error);}};
exports.get=async(req,res,next)=>{try {res.json(await service.get(req.params.id,req.params.questionId));} catch(error){next(error);}};
exports.create=async(req,res,next)=>{try {const after=await service.create(req.params.id,req.body);auditLog(req,'info',{event:'question_created',after});res.status(201).json(after);} catch(error){next(error);}};
exports.update=async(req,res,next)=>{try {const result=await service.update(req.params.id,req.params.questionId,req.body);auditLog(req,'info',{event:'question_updated',...result});res.json(result.after);} catch(error){next(error);}};
exports.remove=async(req,res,next)=>{try {const before=await service.remove(req.params.id,req.params.questionId);auditLog(req,'info',{event:'question_deleted',before});res.status(204).end();} catch(error){next(error);}};
exports.template=async(req,res,next)=>{try {res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="mau-cau-hoi.xlsx"'}).send(Buffer.from(await template()));} catch(error){next(error);}};
exports.import=async(req,res,next)=>{try {
 const result=await importQuestions({roundId:req.params.id,mode:req.body.mode,buffer:req.file?.buffer,token:req.body.previewToken,userId:req.user.id});
 if(req.body.mode==='commit') auditLog(req,'info',{event:'questions_imported',examRoundId:req.params.id,...result});
 res.json(result);
} catch(error){next(error);}};
exports.export=async(req,res,next)=>{try {
 await service.round(req.params.id);
 res.set({'Cache-Control':'no-store','Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="cau-hoi-${req.params.id}.xlsx"`});
 const result=await require('./questions.excel').writeQuestions(req.params.id,res);
 auditLog(req,'info',{event:'questions_exported',examRoundId:req.params.id,...result});
} catch(error){if(res.headersSent){require('../../utils/logger').error({event:'questions_export_failed',examRoundId:req.params.id,message:error.message,stack:error.stack});res.destroy(error);}else next(error);}};
