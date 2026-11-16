const router=require('express').Router({mergeParams:true});
const multer=require('multer');
const {authenticate,requireAdmin}=require('../../middlewares/auth.middleware');
const {httpError}=require('../../utils/http-error');
const controller=require('./questions.controller');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:3,fieldSize:4096,parts:5}}).single('file');
router.use(authenticate,requireAdmin);
router.get('/categories',controller.categories);
router.get('/export',controller.export);
router.post('/import',(req,res,next)=>{req.sensitiveBody=true;upload(req,res,error=>{
 if(error) return next(httpError(422,error.code==='LIMIT_FILE_SIZE'?'File Excel không được quá 5 MB':'Dữ liệu tải lên không hợp lệ, chỉ chọn một file Excel'));
 return next();
});},controller.import);
router.get('/',controller.list);router.get('/:questionId',controller.get);
router.post('/',controller.create);router.patch('/:questionId',controller.update);router.put('/:questionId',controller.update);router.delete('/:questionId',controller.remove);
module.exports=router;
