const router=require('express').Router();
const {authenticate,requireAdmin}=require('../../middlewares/auth.middleware');
const controller=require('./receipts.controller');
router.use(authenticate,requireAdmin,(req,res,next)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});next();});
router.get('/',controller.adminList);
router.get('/:id',controller.adminGet);
module.exports=router;
