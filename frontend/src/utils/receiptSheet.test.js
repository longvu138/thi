import test from 'node:test';import assert from 'node:assert/strict';
import {receiptRows} from './receiptSheet.js';
const receipt={fullName:'Nguyễn Văn An',partyCommittee:'Đảng bộ A',partyBranch:'Chi bộ B',questionCount:30,correctCount:25,wrongCount:5,score10:8.33,result:'PASS',durationSeconds:75,submittedAt:'2026-11-17T03:00:00Z',verificationCode:'AB3K7X'};
test('entry preview uses same receipt rows, keeps personal info and leaves results blank',()=>{
 const rows=receiptRows(receipt,true);assert.equal(rows.length,10);
 assert.deepEqual(rows.slice(0,3),[['Họ và tên',receipt.fullName],['Đảng bộ',receipt.partyCommittee],['Chi bộ',receipt.partyBranch]]);
 assert.ok(rows.slice(3).every(([,value])=>value===''));
});
test('real receipt retains scores, result, Vietnam submission time and verification code',()=>{
 const rows=Object.fromEntries(receiptRows(receipt));assert.equal(rows['Số câu trả lời đúng'],'25/30');assert.equal(rows['Số câu sai'],'5/30');assert.equal(rows['Điểm (thang điểm 10)'],8.33);assert.equal(rows['Kết quả'],'Đạt yêu cầu');assert.equal(rows['Nộp bài lúc'],'10:00 ngày 17/11/2026');assert.equal(rows['Mã xác nhận'],'AB3K7X');
 assert.equal(Object.fromEntries(receiptRows({...receipt,result:'FAIL'}))['Kết quả'],'Không đạt yêu cầu');
});
