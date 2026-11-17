import test from 'node:test';import assert from 'node:assert/strict';
import {parseReceiptCodes,rememberReceiptCode,receiptDate} from './receipts.js';
test('Mã phiếu lưu tối đa mười mã, bỏ trùng và không nhận cache lỗi/thông tin cá nhân',()=>{
 const code='ABCD-1234-5678-90AB-CDEF';assert.deepEqual(parseReceiptCodes('invalid'),[]);assert.deepEqual(parseReceiptCodes('{"fullName":"Tên"}'),[]);
 assert.deepEqual(rememberReceiptCode(JSON.stringify([code,code,'invalid']),code),[code]);
 assert.equal(parseReceiptCodes(JSON.stringify(Array.from({length:20},(_,i)=>`${i.toString(16).padStart(4,'0').toUpperCase()}-1234-5678-90AB-CDEF`))).length,10);
});
test('Ngày và giờ phiếu theo Việt Nam, không phụ thuộc múi giờ trình duyệt',()=>{
 const data=receiptDate('2026-11-12T18:38:00Z');assert.equal(data.date,'13/11/2026');assert.equal(data.time,'01:38');assert.equal(receiptDate('invalid').date,'');
});

test('Lưu được mã 6 ký tự cùng mã cũ',()=>{
 assert.deepEqual(rememberReceiptCode(JSON.stringify(['ABCD-1234-5678-90AB-CDEF']),'AB3K7X'),['AB3K7X','ABCD-1234-5678-90AB-CDEF']);
});
