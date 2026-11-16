import test from 'node:test';import assert from 'node:assert/strict';
import {naturalGroups,applyGroupCount,moveGroup,structureTotal,groupErrors,structurePayload} from './structure.js';
test('sắp xếp tự nhiên, áp dụng k không đổi nguồn, tổng theo nhóm',()=>{
 const rows=[10,2,1].map(i=>({category:`Nghị quyết ${i}`,count:0,validCount:10}));const sorted=naturalGroups(rows);assert.deepEqual(sorted.map(g=>g.category),['Nghị quyết 1','Nghị quyết 2','Nghị quyết 10']);
 const filled=applyGroupCount(sorted,3);assert.equal(structureTotal({mode:'BY_GROUP',groups:filled}),9);assert.ok(rows.every(g=>g.count===0));assert.deepEqual(groupErrors(filled),{});
 assert.equal(structureTotal({mode:'RANDOM',count:50}),50);
});
test('lỗi từng dòng, nhóm 0 hợp lệ, đổi thứ tự và payload không có kiểu phát đề cũ',()=>{
 const rows=[{category:'A',count:0,validCount:0},{category:'B',count:11,validCount:10},{category:'C',count:1.5,validCount:10}];
 assert.equal(Object.keys(groupErrors(rows)).length,2);assert.equal(groupErrors(rows).A,undefined);
 assert.equal(moveGroup(rows,0,-1)[0].category,'A');assert.deepEqual(moveGroup(rows,0,1).map(g=>g.category),['B','A','C']);
 assert.deepEqual(structurePayload({mode:'RANDOM',count:50,groups:rows}),{mode:'RANDOM',count:50});assert.equal(structurePayload({mode:'BY_GROUP',groups:moveGroup(rows,0,1)}).groups[0].order,0);
});
