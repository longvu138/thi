const router=require('express').Router();
const {receiptLookupLimiter}=require('../../middlewares/rate-limit.middleware');
const controller=require('./receipts.controller');
router.use((req,res,next)=>{req.sensitiveBody=true;res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});next();});
router.post('/lookup',receiptLookupLimiter,controller.lookup);
module.exports=router;
