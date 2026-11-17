const test=require('node:test');const assert=require('node:assert/strict');
const {makeCode,normalizeCode,snapshot}=require('./receipts.logic');
test('Mã mới gồm 6 ký tự dễ đọc; chuẩn hóa và vẫn tra cứu mã cũ',()=>{
 for(let i=0;i<200;i++){
  const code=makeCode();assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normalizeCode(code.toLowerCase()),code);
 }
 assert.equal(normalizeCode(' ab3k7x '),'AB3K7X');
 assert.equal(normalizeCode('abcd 1234 5678 90ab cdef'),'ABCD-1234-5678-90AB-CDEF');
 for(const code of [null,'','ABCDE','ABCDEFG','JXBC-FE5K','<script>',{},'A'.repeat(100)])assert.throws(()=>normalizeCode(code),{statusCode:422});
});
test('Phiếu dùng điểm đã chấm, câu bỏ trống tính sai và tách nhãn chạy thử',()=>{
 const row={attempt_number:2,is_trial:1,status:'EXPIRED',correct_count:3,incorrect_count:1,unanswered_count:1,percentage:60,result:'FAIL',duration_seconds:75,submitted_at:'2026-11-12T07:00:00Z'};
 const data=snapshot(row,{title:'E2E_ROUND',questionCount:5,passingPercentage:70},{fullName:'E2E Người thi',partyCommittee:'E2E Đảng bộ',partyBranch:'E2E Chi bộ'});
 assert.equal(data.wrongCount,2);assert.equal(data.score10,6);assert.equal(data.result,'FAIL');assert.equal(data.isTrial,true);assert.equal(data.fullName,'E2E Người thi');assert.equal(data.submittedAt,'2026-11-12T07:00:00Z');
});
