const test=require('node:test');const assert=require('node:assert/strict');
const {makeCode,normalizeCode,snapshot}=require('./receipts.logic');
test('Mã phiếu có 80 bit ngẫu nhiên, chuẩn hóa chữ thường và không nhận mã sai',()=>{
 const codes=new Set(Array.from({length:200},makeCode));assert.equal(codes.size,200);
 for(const code of codes){assert.match(code,/^(?:[0-9A-F]{4}-){4}[0-9A-F]{4}$/);assert.equal(normalizeCode(code.toLowerCase().replaceAll('-',' ')),code);}
 for(const code of [null,'','JXBC-FE5K','<script>',{},'A'.repeat(100)])assert.throws(()=>normalizeCode(code),{statusCode:422});
});
test('Phiếu dùng điểm đã chấm, câu bỏ trống tính sai và tách nhãn chạy thử',()=>{
 const row={attempt_number:2,is_trial:1,status:'EXPIRED',correct_count:3,incorrect_count:1,unanswered_count:1,percentage:60,result:'FAIL',duration_seconds:75,submitted_at:'2026-11-12T07:00:00Z'};
 const data=snapshot(row,{title:'E2E_ROUND',questionCount:5,passingPercentage:70},{fullName:'E2E Người thi',partyCommittee:'E2E Đảng bộ',partyBranch:'E2E Chi bộ'});
 assert.equal(data.wrongCount,2);assert.equal(data.score10,6);assert.equal(data.result,'FAIL');assert.equal(data.isTrial,true);assert.equal(data.fullName,'E2E Người thi');assert.equal(data.submittedAt,'2026-11-12T07:00:00Z');
});
