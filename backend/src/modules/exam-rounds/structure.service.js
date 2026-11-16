const db=require('../../config/database');
const {httpError}=require('../../utils/http-error');
const {validQuestionQuery}=require('../../utils/valid-questions-query');
const {validateId}=require('./exam-rounds.validator');
const {parseSelection,groupName,groupKey,naturalCompare,validateStructure,capacityErrors,structureError,LOCK_MESSAGE}=require('./structure.logic');
const {selectQuestions}=require('./structure.selection');
const {snapshotQuestion}=require('../attempts/attempts.logic');
const getRound=async(trx,id,lock=false)=>{validateId(id);const query=trx('exam_rounds').where({id});if(lock)query.forUpdate();const row=await query.first();if(!row)throw httpError(404,'Không tìm thấy đợt kiểm tra');return row;};
const locked=async(trx,id)=>Boolean(await trx('attempts').where({exam_round_id:id,is_trial:0}).first('id'));
const catalog=async(trx,id)=>{
 const map=new Map();
 for(const valid of [false,true]){let cursor;while(true){
  const query=(valid?validQuestionQuery(id,trx):trx('questions').where({exam_round_id:id}).whereNull('deleted_at')).select('id','category_name').orderBy('id').limit(100);if(cursor)query.where('id','>',cursor);
  const rows=await query;if(!rows.length)break;
  for(const row of rows){const key=groupKey(row.category_name);if(!map.has(key)){if(map.size>=1000)throw httpError(409,'Mỗi đợt hỗ trợ tối đa 1000 nghị quyết');map.set(key,{category:groupName(row.category_name),validCount:0});}if(valid)map.get(key).validCount++;}cursor=rows.at(-1).id;
 }}
 return [...map.values()].sort((a,b)=>naturalCompare(a.category,b.category));
};
const assertCapacity=async(trx,round,status=409)=>{
 const errors=capacityErrors(parseSelection(round.selection_config),Number(round.question_count),await catalog(trx,round.id));
 if(errors.length)throw structureError(errors,status);
};
const get=async id=>db.transaction(async trx=>{
 const round=await getRound(trx,id);const config=parseSelection(round.selection_config),available=await catalog(trx,id);
 const stored=new Map(config.groups.map(g=>[groupKey(g.category),g]));
 const groups=available.map((g,i)=>({...g,count:stored.get(groupKey(g.category))?.count||0,order:stored.get(groupKey(g.category))?.order??config.groups.reduce((max,g)=>Math.max(max,g.order),-1)+1+i,isNew:!stored.has(groupKey(g.category))}));
 for(const g of config.groups)if(!available.some(a=>groupKey(a.category)===groupKey(g.category)))groups.push({...g,validCount:0,isNew:false});
 groups.sort((a,b)=>a.order-b.order||naturalCompare(a.category,b.category));
 return {selectionConfig:config,questionCount:Number(round.question_count),groups,locked:await locked(trx,id)};
},{isolationLevel:'repeatable read'});
const prepare=async(trx,round,body)=>{
 const data=validateStructure(body),available=await catalog(trx,round.id),errors=capacityErrors(data.selectionConfig,data.questionCount,available);
 if(errors.length)throw structureError(errors);
 if(data.selectionConfig.mode==='BY_GROUP'){
  const supplied=new Set(data.selectionConfig.groups.map(g=>groupKey(g.category)));
  // Nhóm vừa import nhưng không có trong request được lưu ở cuối, định mức 0.
  const ordered=data.selectionConfig.groups;let order=ordered.reduce((max,g)=>Math.max(max,g.order),-1)+1;
  for(const group of available)if(!supplied.has(groupKey(group.category)))ordered.push({category:group.category,count:0,order:order++});
 }
 return data;
};
const save=async(id,body)=>db.transaction(async trx=>{
 const round=await getRound(trx,id,true);if(await locked(trx,id))throw httpError(409,LOCK_MESSAGE);
 const data=await prepare(trx,round,body);
 await trx('exam_rounds').where({id}).update({selection_config:JSON.stringify(data.selectionConfig),question_count:data.questionCount,updated_at:trx.fn.now()});
 return data;
});
const preview=async(id,body)=>db.transaction(async trx=>{
 const round=await getRound(trx,id),data=await prepare(trx,round,body);
 const rows=await selectQuestions(trx,{...round,selection_config:data.selectionConfig,question_count:data.questionCount});
 return {...data,questions:rows.map((q,index)=>({id:q.id,position:index+1,...snapshotQuestion(q,Boolean(round.shuffle_options))}))};
},{isolationLevel:'repeatable read'});
module.exports={get,save,preview,assertCapacity};
