const service=require('./structure.service');
const {auditLog}=require('../../utils/audit-log');
exports.get=async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await service.get(req.params.id));}catch(error){next(error);}};
exports.save=async(req,res,next)=>{try{const data=await service.save(req.params.id,req.body);auditLog(req,'info',{event:'exam_structure_updated',examRoundId:req.params.id,...data});res.set('Cache-Control','no-store').json(data);}catch(error){next(error);}};
exports.preview=async(req,res,next)=>{try{const data=await service.preview(req.params.id,req.body);auditLog(req,'info',{event:'exam_structure_previewed',examRoundId:req.params.id,selectionConfig:data.selectionConfig,questionCount:data.questionCount});res.set('Cache-Control','no-store').json(data);}catch(error){next(error);}};
