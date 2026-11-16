const {candidateLimiter}=require('../../middlewares/rate-limit.middleware');
const express = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');
const service = require('./results.service');
const router = express.Router();
router.get('/', authenticate, requireRole('USER'), candidateLimiter, async (req, res, next) => {
 try { res.set('Cache-Control', 'no-store').json(await service.list(req.user.id, req.query)); }
 catch (error) { next(error); }
});
module.exports = router;
