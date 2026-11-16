const service = require('./attempts.service');
const { validateSubmit, validateStart } = require('./attempts.validator');
const { auditLog } = require('../../utils/audit-log');
exports.start = async (req, res, next) => {
 try { const options=validateStart(req.body); const result = await service.start(req.params.id, req.user.id,options); if (result.created) auditLog(req, 'info', { event: 'attempt_started', attemptId: result.attempt.id, isTrial: result.attempt.isTrial }); res.status(result.created ? 201 : 200).json(result.attempt); }
 catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
 try { res.json(await service.get(req.params.id, req.user.id)); } catch (error) { next(error); }
};
exports.answers = async (req, res, next) => {
 try { const result = await service.saveAnswers(req.params.id, req.user.id, req.body); auditLog(req, 'info', { event: 'attempt_answers_saved', attemptId: req.params.id, savedCount: result.savedCount }); res.json(result); } catch (error) { next(error); }
};
exports.submit = async (req, res, next) => {
 try { const body=validateSubmit(req.body); const result = await service.submit(req.params.id, req.user.id,body); auditLog(req, 'info', { event: 'attempt_submit', attemptId: req.params.id, status: result.status }); res.json(result); } catch (error) { next(error); }
};
exports.clearTrialData = async (req, res, next) => {
 try {
  if (!req.body || req.body.confirm !== true || Object.keys(req.body).some(key => key !== 'confirm')) {
   throw require('../../utils/http-error').httpError(422, 'Vui lòng xác nhận xóa dữ liệu chạy thử bằng confirm=true');
  }
  const result = await service.clearTrialData(req.params.id);
  auditLog(req, 'info', { event: 'trial_data_deleted', examRoundId: req.params.id, ...result }); res.json(result);
 } catch (error) { next(error); }
};

exports.result = async (req, res, next) => {
 try { res.json(await service.get(req.params.id, req.user.id, { includeResult: true })); } catch (error) { next(error); }
};
