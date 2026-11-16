const test=require('node:test'),assert=require('node:assert/strict');
const {validateStructure,groupKey,capacityErrors,naturalCompare}=require('./structure.logic');
test('RANDOM và BY_GROUP tự tính tổng, nhóm 0, chuẩn hóa và thứ tự',()=>{
 assert.equal(validateStructure({mode:'RANDOM',count:50}).questionCount,50);
 const result=validateStructure({mode:'BY_GROUP',groups:[{category:' Nghị  quyết 2 ',count:3,order:1},{category:'Nghị quyết 1',count:0,order:0}]});
 assert.equal(result.questionCount,3);assert.equal(result.selectionConfig.groups[0].count,0);assert.equal(result.selectionConfig.groups[1].category,'Nghị quyết 2');
 assert.equal(groupKey(' ĐẢNG  BỘ '.normalize('NFD')),groupKey('đảng bộ'));
 assert.deepEqual(['NQ 10','NQ 2','NQ 1'].sort(naturalCompare),['NQ 1','NQ 2','NQ 10']);
});
test('lỗi từng nhóm, định mức vượt khả năng và không còn chế độ cũ',()=>{
 for(const body of [{mode:'EQUAL',groups:[]},{mode:'RANDOM',count:0},{mode:'BY_GROUP',groups:[{category:'A',count:0,order:0}]}])assert.throws(()=>validateStructure(body),{statusCode:422});
 assert.throws(()=>validateStructure({mode:'BY_GROUP',groups:[{category:'A',count:-1,order:0}]}),e=>e.groupErrors[0].category==='A');
 const config={mode:'BY_GROUP',groups:[{category:'A',count:3,order:0},{category:'B',count:0,order:1}]};assert.equal(capacityErrors(config,3,[{category:'a',validCount:2}])[0].count,3);
});
