const {validateId}=require('./attempts.validator');
const {httpError}=require('../../utils/http-error');
const validateHistory=(roundId,userId,query={})=>{validateId(roundId);validateId(userId);if(Object.keys(query).some(key=>!['page','limit'].includes(key)))throw httpError(422,'Bộ lọc lịch sử không hợp lệ');};
module.exports={validateHistory};
