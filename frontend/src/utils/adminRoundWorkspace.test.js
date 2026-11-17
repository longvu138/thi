import {normalizeRoundList} from './examRounds.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {adminSplitLayout,isReceiptCode,configSummary,structureSummary,roundTodos,legacyAdminTarget} from './adminRoundWorkspace.js';
test('desktop split starts at 1200; tablet and phone navigate list to overview',()=>{
 assert.equal(adminSplitLayout(1440),true);assert.equal(adminSplitLayout(1200),true);assert.equal(adminSplitLayout(1024),false);assert.equal(adminSplitLayout(390),false);
});
test('receipt lookup distinguishes exact codes and plain round titles',()=>{
 for(const s of ['AB3K7X',' ab3k7x ','ABCD-1234-5678-90AB-CDEF'])assert.equal(isReceiptCode(s),true);
 for(const s of ['Nghị quyết 1','','AB3K7','http://bad'])assert.equal(isReceiptCode(s),false);
});
test('configuration, group summary and todos use saved round values',()=>{
 const r={questionCount:30,durationMinutes:20,maxAttempts:2,passingPercentage:70,structureSufficient:true,startAt:'2099-01-01',endAt:'2099-02-01',totalValidQuestionCount:50};
 assert.match(configSummary(r),/^30 câu · 20 phút · 2 lượt · Đạt từ 70%/);
 assert.match(configSummary(r),/Chạy thử: Không.*Bắt đầu:.*Kết thúc:.*giờ Việt Nam/);
 assert.equal(structureSummary({selectionConfig:{mode:'BY_GROUP'},groups:[{category:'NQ1',count:5},{category:'NQ2',count:0}]}),'NQ1: 5 câu · NQ2: 0 câu');
 assert.equal(roundTodos(r,{groups:[]}).length,0);assert.ok(roundTodos({},null).some(i=>i.panel==='questions'));
});
test('legacy links map to same workspace, proper panel and receipt, removing auto print',()=>{
 assert.equal(legacyAdminTarget({id:'a',kind:'reports'}),'/admin/exam-rounds/a?panel=results');
 assert.equal(legacyAdminTarget({id:'a',search:'?tab=structure'}),'/admin/exam-rounds/a?panel=structure');
 assert.equal(legacyAdminTarget({id:'a',search:'?tab=questions'}),'/admin/exam-rounds/a?panel=questions');
 assert.equal(legacyAdminTarget({id:'a',search:'?tab=overview'}),'/admin/exam-rounds/a?panel=config');
 assert.equal(legacyAdminTarget({id:'a',search:'?tab=bad'}),'/admin/exam-rounds/a');
 assert.equal(legacyAdminTarget({kind:'receipts'}),'/admin/exam-rounds');
 assert.equal(legacyAdminTarget({id:'a',kind:'receipt',search:'?action=print'}),'/admin/exam-rounds?receiptAttempt=a');
});

test('round list keeps status counters and per-round summary from Backend',()=>{
 const value=normalizeRoundList({statusCounts:{OPEN:2,DRAFT:1,CLOSED:3},items:[{id:'a',summary:{submittedCount:4},missing:[]}],pagination:{total:2}});
 assert.equal(value.statusCounts.DRAFT,1);assert.equal(value.items[0].summary.submittedCount,4);
});
