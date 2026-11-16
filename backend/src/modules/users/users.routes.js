const router = require('express').Router();
const { authenticate, requireAdmin } = require('../../middlewares/auth.middleware');
const { sensitiveAuthLimiter } = require('../../middlewares/rate-limit.middleware');
const controller = require('./users.controller');
router.use(authenticate,requireAdmin);
router.get('/template',controller.template);
const upload=require('multer')({storage:require('multer').memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:3,fieldSize:4096,parts:5}}).single('file');
router.post('/import',sensitiveAuthLimiter,(req,res,next)=>{
 req.sensitiveBody=true;
 upload(req,res,error=>error?next(require('../../utils/http-error').httpError(422,error.code==='LIMIT_FILE_SIZE'?'File không được quá 5 MB':'Dữ liệu tải lên không hợp lệ')):next());
},controller.import);
router.get('/',controller.list); router.get('/:id',controller.get);
router.post('/',sensitiveAuthLimiter,controller.create); router.patch('/:id',sensitiveAuthLimiter,controller.update); router.put('/:id',sensitiveAuthLimiter,controller.update); router.delete('/:id',sensitiveAuthLimiter,controller.remove);
module.exports = router;
