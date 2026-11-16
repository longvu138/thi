const router=require('express').Router();
const {authenticate,requireAdmin}=require('../../middlewares/auth.middleware');
const {auditLog}=require('../../utils/audit-log');
const service=require('./settings.service');
router.get('/public/guide',async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await service.get());}catch(error){next(error);}});
router.put('/admin/guide',authenticate,requireAdmin,async(req,res,next)=>{try{
 const value=await service.save(req.body);auditLog(req,'info',{event:'guide_settings_updated',supportContact:value.supportContact});res.json(value);
}catch(error){next(error);}});
module.exports=router;
