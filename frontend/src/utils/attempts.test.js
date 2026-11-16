import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAttempt,attemptReceipt,remainingSeconds,formatAttemptClock,groupAttemptQuestions,attemptWarnings,attemptShortcut} from './attempts.js';
test('API null có fallback; lựa chọn chỉ có key/nội dung, không mang khóa đáp án backend',()=>{
 assert.deepEqual(normalizeAttempt(null).questions,[]);
 const normalized=normalizeAttempt({questions:[null,{id:'q',options:[null,{key:'A',content:'Một',originalKey:'B'}],correctAnswer:'A'}]});
 assert.deepEqual(normalized.questions[0].options,[{key:'A',content:'Một'}]);assert.equal('correctAnswer' in normalized.questions[0],false);
});
test('Đồng hồ dùng mốc server và thời gian đơn điệu, không phụ thuộc giờ máy người thi',()=>{
 const receipt=attemptReceipt({serverTime:'2026-11-11T01:00:00Z',expiresAt:'2026-11-11T01:10:00Z'},1000,1200);
 assert.equal(remainingSeconds(receipt.deadline,1200),600);assert.equal(remainingSeconds(receipt.deadline,61200),540);assert.equal(remainingSeconds(receipt.deadline,999999),0);
 assert.equal(formatAttemptClock(3661),'01:01:01');assert.equal(formatAttemptClock(61),'01:01');
});
test('Nhóm giữ thứ tự xuất hiện và vị trí câu thực tế trong đề xáo trộn',()=>{
 const groups=groupAttemptQuestions([{id:'1',categoryName:'A',position:1},{id:'2',categoryName:'B',position:2},{id:'3',categoryName:'A',position:3}]);
 assert.deepEqual(groups.map(x=>x.name),['A','B']);assert.deepEqual(groups[0].items.map(x=>x.index),[0,2]);
});
test('Nhắc 10 và 5 phút mỗi mốc một lần, không nhắc sau khi hết giờ',()=>{
 const seen=new Set();assert.deepEqual(attemptWarnings(601,600,seen),[600]);seen.add(600);assert.deepEqual(attemptWarnings(650,599,seen),[]);assert.deepEqual(attemptWarnings(301,300,seen),[300]);assert.deepEqual(attemptWarnings(1,0,seen),[]);
});
test('Phím tắt không kích hoạt khi nhập liệu, mở modal, có modifier hoặc tắt thao tác',()=>{
 const event={key:'a',target:{closest:()=>null}};assert.deepEqual(attemptShortcut(event),{answer:'A'});assert.deepEqual(attemptShortcut({...event,key:'ArrowLeft'}),{move:-1});
 assert.equal(attemptShortcut(event,{dialog:true}),null);assert.equal(attemptShortcut({...event,ctrlKey:true}),null);assert.equal(attemptShortcut({...event,target:{closest:()=>({})}}),null);assert.equal(attemptShortcut(event,{enabled:false}),null);
});

import {canAutoSave} from './attempts.js';
test('Lưu lỗi mạng khi trình duyệt vẫn báo online tự thử lại theo mốc, lỗi nghiệp vụ không thử',()=>{
 const state={pendingCount:1,error:{response:{status:503}},retryAt:2000};assert.equal(canAutoSave(state,true,1999),false);assert.equal(canAutoSave(state,true,2000),true);assert.equal(canAutoSave(state,false,3000),false);assert.equal(canAutoSave({...state,error:{response:{status:422}}},true,3000),false);
});
