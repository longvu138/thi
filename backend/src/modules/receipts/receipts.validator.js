const {httpError}=require('../../utils/http-error');
const normalizeCode=value=>{
 if(typeof value!=='string'||value.length>80)throw httpError(422,'Vui lòng nhập mã tra cứu hợp lệ');
 const raw=value.trim().toUpperCase().replace(/[\s-]/g,'');
 if(!/^[0-9A-F]{20}$/.test(raw))throw httpError(422,'Mã tra cứu gồm 5 nhóm, mỗi nhóm 4 ký tự');
 return raw.match(/.{4}/g).join('-');
};
const validateLookup=body=>{
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='code'))throw httpError(422,'Dữ liệu tra cứu không hợp lệ');
 return normalizeCode(body.code);
};
module.exports={normalizeCode,validateLookup};
