import test from 'node:test';import assert from 'node:assert/strict';import {normalizeReport,reportFilters} from './reports.js';
test('Báo cáo chuẩn hóa null, giữ thống kê người và lượt độc lập',()=>{
 assert.deepEqual(normalizeReport(null).items,[]);assert.equal(normalizeReport(null).statistics.participantCount,0);
 const report=normalizeReport({items:[null,{userId:'a'}],statistics:{participantCount:'2',attemptCount:'5'}});
 assert.equal(report.items.length,1);assert.equal(report.statistics.participantCount,2);assert.equal(report.statistics.attemptCount,5);
});
test('Bộ lọc xuất giống bộ lọc bảng, không đưa phân trang vào bộ lọc nghiệp vụ',()=>{
 assert.deepEqual(reportFilters({search:' A ',partyBranch:'',isTrial:'false',result:'PASSED',page:5}),{search:'A',isTrial:'false',result:'PASSED'});
});
