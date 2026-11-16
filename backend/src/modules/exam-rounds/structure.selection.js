const {randomInt}=require('node:crypto');
const {validQuestionQuery}=require('../../utils/valid-questions-query');
const {httpError}=require('../../utils/http-error');
const {shuffle}=require('../attempts/attempts.logic');
const {groupKey,parseSelection}=require('./structure.logic');
// Reservoir sampling: đọc lô 100, giữ đúng số câu cần lấy của mỗi nhóm.
const selectQuestions=async(trx,round)=>{
 const config=parseSelection(round.selection_config);
 const groups=config.mode==='RANDOM'?[{category:'*',count:Number(round.question_count),order:0}]:config.groups.filter(g=>g.count>0).sort((a,b)=>a.order-b.order);
 const pools=new Map(groups.map(g=>[config.mode==='RANDOM'?'*':groupKey(g.category),{...g,seen:0,rows:[]}]));
 let cursor;
 while(true){
  const query=validQuestionQuery(round.id,trx).orderBy('id').limit(100);if(cursor)query.where('id','>',cursor);
  const rows=await query.select('*');if(!rows.length)break;
  for(const row of rows){const pool=pools.get(config.mode==='RANDOM'?'*':groupKey(row.category_name));if(!pool)continue;
   pool.seen++;if(pool.rows.length<pool.count)pool.rows.push(row);else{const index=randomInt(pool.seen);if(index<pool.count)pool.rows[index]=row;}
  }cursor=rows.at(-1).id;
 }
 if(!groups.length)throw httpError(409,'Cơ cấu đề chưa có câu hỏi được chọn');
 return [...pools.values()].flatMap(pool=>{
  if(pool.rows.length<pool.count)throw httpError(409,`Không đủ câu hợp lệ${pool.category==='*'?'':` cho nghị quyết ${pool.category}`}: cần ${pool.count}, có ${pool.rows.length}`);
  const sorted=pool.rows.sort((a,b)=>a.question_code.localeCompare(b.question_code,'vi',{numeric:true})||a.id.localeCompare(b.id));
  const selected=round.shuffle_questions?shuffle(sorted):sorted;
  return config.mode==='BY_GROUP'?selected.map(row=>({...row,category_name:pool.category})):selected;
 });
};
module.exports={selectQuestions};
