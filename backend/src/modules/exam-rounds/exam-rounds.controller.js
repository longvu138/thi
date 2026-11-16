const service = require('./exam-rounds.service');
const { auditLog } = require('../../utils/audit-log');
exports.list = async (req, res, next) => {
 try { res.set('Cache-Control','no-store').json(await service.list(req.query,{userId:req.user.id})); } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
 try { res.set('Cache-Control','no-store').json(await service.get(req.params.id,{userId:req.user.id})); } catch (error) { next(error); }
};
exports.adminList = async (req, res, next) => {
 try { res.set('Cache-Control','no-store').json(await service.list(req.query, { admin: true })); } catch (error) { next(error); }
};
exports.adminGet = async (req, res, next) => {
 try { res.set('Cache-Control','no-store').json(await service.get(req.params.id, { admin: true })); } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
 try {
  const after = await service.create(req.body);
  auditLog(req, 'info', { event: 'exam_round_created', after }); res.status(201).json(after);
 } catch (error) { next(error); }
};
exports.update = async (req, res, next) => {
 try {
  const result = await service.update(req.params.id, req.body);
  auditLog(req, 'info', { event: 'exam_round_updated', ...result }); res.json(result.after);
 } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
 try {
  const before = await service.remove(req.params.id);
  auditLog(req, 'info', { event: 'exam_round_deleted', before }); res.status(204).end();
 } catch (error) { next(error); }
};

exports.publicList = async (req,res,next) => {
 try { res.set('Cache-Control','no-store').json(await service.publicList(req.query)); } catch(error) { next(error); }
};
