// Fixture cũ đặt số câu trước khi thêm câu hỏi; không phải API tương thích cho ứng dụng.
const service=require('../modules/exam-rounds/exam-rounds.service');
const db=require('../config/database');
exports.create=async({questionCount,...body})=>{
 const row=await service.create(body);
 if(questionCount!==undefined)await db('exam_rounds').where({id:row.id}).update({question_count:questionCount});
 return service.get(row.id,{admin:true});
};
for(const key of ['get','list','update','remove','publicList'])exports[key]=service[key];
