const service = require('./users.service');
const { auditLog } = require('../../utils/audit-log');
exports.list = async (req,res,next) => { try { res.json(await service.list(req.query)); } catch(error) { next(error); } };
exports.get = async (req,res,next) => { try { res.json(service.serialize(await service.get(req.params.id))); } catch(error) { next(error); } };
exports.create = async (req,res,next) => {
  try { const user = await service.create(req.body); auditLog(req,'info',{event:'user_created',targetUserId:user.id,after:user}); res.status(201).json(user); } catch(error) { next(error); }
};
exports.update = async (req,res,next) => {
  try { const result = await service.update(req.params.id,req.body,req.user.id); auditLog(req,'info',{event:'user_updated',targetUserId:req.params.id,...result,passwordChanged:req.body.password !== undefined}); res.json(result.after); } catch(error) { next(error); }
};
exports.remove = async (req,res,next) => {
  try { const result = await service.update(req.params.id,null,req.user.id,true); auditLog(req,'info',{event:'user_deleted',targetUserId:req.params.id,...result}); res.status(204).end(); } catch(error) { next(error); }
};

exports.template = async (req,res,next) => {try {const buffer=await require('./users.excel').template();res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="mau-tai-khoan.xlsx"'}).send(Buffer.from(buffer));} catch(error){next(error);}};
exports.import = async (req,res,next) => {try {
 const result=await require('./users.import.service').importUsers({mode:req.body.mode,buffer:req.file?.buffer,token:req.body.previewToken,userId:req.user.id});
 if(req.body.mode==='commit')auditLog(req,'info',{event:'users_imported',...result});res.json(result);
} catch(error){next(error);}};
