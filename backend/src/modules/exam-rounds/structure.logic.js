const {httpError}=require('../../utils/http-error');
const DEFAULT_SELECTION={mode:'RANDOM',groups:[]};
const LOCK_MESSAGE='Đợt đã có người thi, không thay đổi được cơ cấu đề';
const groupName=value=>value.normalize('NFC').trim().replace(/\s+/gu,' ');
const groupKey=value=>groupName(value).toLocaleLowerCase('vi');
const naturalCompare=(a,b)=>a.localeCompare(b,'vi',{numeric:true,sensitivity:'variant'});
const parseSelection=value=>typeof value==='string'?JSON.parse(value):value||DEFAULT_SELECTION;
const validateStructure=body=>{
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['mode','count','groups'].includes(k))||!['RANDOM','BY_GROUP'].includes(body.mode))throw httpError(422,'Cơ cấu đề không hợp lệ');
 if(body.mode==='RANDOM'){
  if(!Number.isInteger(body.count)||body.count<1||body.count>2147483647)throw httpError(422,'Số câu mỗi đề phải là số nguyên dương');
  if(body.groups!==undefined&&(!Array.isArray(body.groups)||body.groups.length))throw httpError(422,'Chế độ ngẫu nhiên toàn bộ không nhận định mức nhóm');
  return {selectionConfig:{mode:'RANDOM',groups:[]},questionCount:body.count};
 }
 if(body.count!==undefined||!Array.isArray(body.groups)||body.groups.length>1000)throw httpError(422,'Danh sách nhóm cơ cấu không hợp lệ (tối đa 1000 nhóm)');
 const keys=new Set(),orders=new Set(),errors=[];
 const groups=body.groups.map((g,index)=>{
  const category=typeof g?.category==='string'?groupName(g.category):'';
  let message;
  if(!g||Object.keys(g).some(k=>!['category','count','order'].includes(k))||!category||category.length>255)message='Tên nghị quyết không hợp lệ';
  else if(keys.has(groupKey(category)))message='Nghị quyết bị trùng';
  else if(!Number.isInteger(g.count)||g.count<0||g.count>2147483647)message='Lấy mỗi đề phải là số nguyên từ 0 trở lên';
  else if(!Number.isInteger(g.order)||g.order<0||orders.has(g.order))message='Thứ tự nghị quyết không hợp lệ hoặc bị trùng';
  keys.add(groupKey(category));orders.add(g?.order);
  if(message)errors.push({index,category,message});
  return {category,count:g?.count,order:g?.order};
 });
 if(errors.length)throw structureError(errors);
 const total=groups.reduce((sum,g)=>sum+g.count,0);
 if(total<1||total>2147483647)throw httpError(422,'Tổng số câu mỗi đề phải từ 1 đến 2147483647');
 return {selectionConfig:{mode:'BY_GROUP',groups:groups.sort((a,b)=>a.order-b.order)},questionCount:total};
};
const structureError=(groupErrors,status=422)=>Object.assign(httpError(status,'Vui lòng kiểm tra số câu của từng nghị quyết','STRUCTURE_INVALID'),{groupErrors});
const capacityErrors=(config,count,catalog)=>{
 if(config.mode==='RANDOM'){const available=catalog.reduce((sum,g)=>sum+g.validCount,0);return count>available?[{category:'',message:`Chỉ có ${available} câu hợp lệ, cần ${count}`,available,count}]:[];}
 const counts=new Map(catalog.map(g=>[groupKey(g.category),g.validCount]));
 return config.groups.flatMap((g,index)=>g.count>(counts.get(groupKey(g.category))||0)?[{index,category:g.category,count:g.count,available:counts.get(groupKey(g.category))||0,message:`Chỉ có ${counts.get(groupKey(g.category))||0} câu hợp lệ, không thể lấy ${g.count}`}]:[]);
};
module.exports={DEFAULT_SELECTION,LOCK_MESSAGE,groupName,groupKey,naturalCompare,parseSelection,validateStructure,structureError,capacityErrors};
