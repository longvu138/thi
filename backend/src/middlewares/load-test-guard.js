const {httpError}=require('../utils/http-error');
// Chứng minh API cùng DB thử trước khi script tạo người dự thi; không bật trên DB thật.
const loadTestGuard=(req,res,next)=>{
 const requested=req.get('X-Load-Test-Database');if(!requested)return next();
 const name=process.env.DB_NAME;
 if(process.env.NODE_ENV==='production'||process.env.LOAD_TEST_ENABLED!=='true'||!/^exam_load_test_[a-z0-9_]+$/.test(name||'')||requested!==name)return next(httpError(403,'Máy chủ không cho phép thử tải trên database này'));
 const simulated=req.get('X-Load-Test-IP');
 if(simulated){
  if(!/^198\.18\.\d{1,3}\.\d{1,3}$/.test(simulated)||simulated.split('.').some(n=>Number(n)>255))return next(httpError(422,'IP mô phỏng không hợp lệ'));
  Object.defineProperty(req,'ip',{value:simulated,configurable:true});
  req.clientInfo=require('../utils/client-info').getClientInfo(req);
 }
 res.set('X-Load-Test-Database',name);return next();
};
module.exports={loadTestGuard};
