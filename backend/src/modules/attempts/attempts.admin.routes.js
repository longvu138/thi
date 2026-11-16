const router=require('express').Router();
const {authenticate,requireAdmin}=require('../../middlewares/auth.middleware');
router.use(authenticate,requireAdmin,(req,res,next)=>{req.sensitiveBody=true;next();});
router.get('/:id',require('./attempts.admin.controller').get);
module.exports=router;
