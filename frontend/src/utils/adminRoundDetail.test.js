import test from 'node:test';import assert from 'node:assert/strict';
import {roundOpenMissing,adminRoundCountdown,unallocatedGroups,prioritizeNewGroups} from './adminRoundDetail.js';
const now=Date.parse('2030-01-01T00:00:00Z');
const round={status:'DRAFT',startAt:'2099-01-01T00:00:00Z',endAt:'2099-01-02T00:00:00Z',questionCount:30,structureSufficient:true};
const structure={selectionConfig:{mode:'BY_GROUP'},groups:[{category:'NQ1',count:30,validCount:50,isNew:false}]};
test('open requires enough structure and valid start/end in the future',()=>{
 assert.deepEqual(roundOpenMissing(round,structure,now),[]);
 const missing=roundOpenMissing({...round,startAt:null,endAt:null,structureSufficient:false},structure,now);
 assert.ok(missing.includes('Thiếu giờ bắt đầu'));assert.ok(missing.includes('Thiếu giờ kết thúc'));assert.ok(missing.includes('Cơ cấu chưa đủ câu hợp lệ'));
 assert.ok(roundOpenMissing({...round,endAt:'2029-01-01'},structure,now).includes('Giờ kết thúc phải sau hiện tại'));
 assert.ok(roundOpenMissing(round,null,now).includes('Chưa tải được cơ cấu đề'));
});
test('countdown distinguishes upcoming, running, trial and ended rounds',()=>{
 assert.equal(adminRoundCountdown({...round,startAt:'2030-01-05T00:00:00Z'},now),'Còn 4 ngày');
 assert.equal(adminRoundCountdown({...round,status:'OPEN',startAt:'2029-12-31',endAt:'2030-01-01T02:00:00Z'},now),'Đang thi, kết thúc sau 2 giờ');
 assert.match(adminRoundCountdown({...round,status:'OPEN',trialStartAt:'2029-12-31'},now),/^Đang chạy thử/);
 assert.equal(adminRoundCountdown({...round,status:'CLOSED'},now),'Đã kết thúc');
});
test('unallocated new groups sort first without changing allocation order in source',()=>{
 const groups=[{category:'NQ1',isNew:false,count:2},{category:'NQ2',isNew:true,count:0},{category:'NQ3',isNew:true,count:1}];
 assert.deepEqual(unallocatedGroups({...structure,groups}).map(g=>g.category),['NQ2']);
 assert.deepEqual(prioritizeNewGroups(groups).map(g=>[g.category,g._index]),[['NQ2',1],['NQ1',0],['NQ3',2]]);
 assert.equal(groups[0].category,'NQ1');assert.equal(unallocatedGroups({selectionConfig:{mode:'RANDOM'},groups}).length,0);
});
