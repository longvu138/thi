const test=require('node:test'),assert=require('node:assert/strict');
const {participation}=require('./participation.logic');
const now=Date.parse('2026-11-12T02:00:00Z');const round={status:'OPEN',max_attempts:3,start_at:new Date(now-60000),end_at:new Date(now+60000),stop_after_pass:false};
test('Trạng thái riêng chính thức: còn lượt, hết lượt, đã đạt và giữ kết quả cuối',()=>{
 assert.equal(participation(round,{used:1,last:1},undefined,null,now).remainingAttempts,2);
 assert.equal(participation(round,{used:3},undefined,null,now).reasonCode,'LIMIT_REACHED');
 const passed=participation({...round,stop_after_pass:true},{used:1,passed:1},undefined,null,now);assert.equal(passed.reasonCode,'PASSED');assert.equal(passed.finalResult,'PASSED');
 assert.equal(participation(round,{used:1,passed:1},undefined,null,now).canStart,true);
});
test('Chưa tới giờ, đóng, hết giờ và resume không tạo lượt mới',()=>{
 assert.equal(participation({...round,start_at:new Date(now+1000)},undefined,undefined,null,now).reasonCode,'NOT_STARTED');
 assert.equal(participation({...round,end_at:new Date(now)},undefined,undefined,null,now).reasonCode,'ENDED');
 const resumed=participation({...round,status:'CLOSED'},{used:3},undefined,{id:'own',isTrial:false},now);assert.equal(resumed.canResume,true);assert.equal(resumed.canStart,false);assert.equal(resumed.reason,null);
});
test('Chạy thử dùng giới hạn riêng, không trừ lượt chính thức và kết quả chính thức',()=>{
 const p=participation({...round,trial_start_at:new Date(now-1000),start_at:new Date(now+1000)},{used:2,last:2},{used:1,last:1,passed:1},null,now);
 assert.equal(p.isTrial,true);assert.equal(p.usedAttempts,2);assert.equal(p.remainingAttempts,1);assert.equal(p.trialUsedAttempts,1);assert.equal(p.nextAttemptNumber,2);assert.equal(p.canStart,true);
});
const {keyFor}=require('../reports/committees.service');
test('Nhóm đảng bộ gộp NFC, khoảng trắng và hoa/thường nhưng giữ phân biệt dấu',()=>{
 assert.equal(keyFor(' ĐẢNG   BỘ A '),keyFor('Đảng bộ A'.normalize('NFD')));assert.notEqual(keyFor('Đảng bộ A'),keyFor('Dang bo A'));
});
