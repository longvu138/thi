import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuestionList,normalizePreview,questionPayload,canCommitPreview} from './questions.js';
import {canAccessNavItem} from '../app/navigation.js';
test('Câu hỏi và preview null có fallback an toàn',()=>{assert.deepEqual(normalizeQuestionList(null).items,[]);assert.deepEqual(normalizePreview({rows:[{data:null,errors:null}]}).rows[0],{data:{},errors:[]});});
test('Payload giữ lựa chọn trống và cờ không xáo trộn',()=>{const result=questionPayload({questionCode:' Q ',allowShuffleOptions:false});assert.equal(result.questionCode,'Q');assert.equal(result.optionC,'');assert.equal(result.allowShuffleOptions,false);});
test('Chỉ cho xác nhận preview hợp lệ có mã xác nhận',()=>{assert.equal(canCommitPreview(null),false);assert.equal(canCommitPreview({previewToken:'x',total:2,validCount:1,errorCount:1}),false);assert.equal(canCommitPreview({previewToken:'x',total:2,validCount:2,errorCount:0}),true);});
test('Câu hỏi nằm trong đợt ADMIN, không còn menu ngân hàng riêng',()=>{assert.equal(canAccessNavItem({role:'ADMIN'},'questions'),false);assert.equal(canAccessNavItem({role:'USER'},'questions'),false);});

test('Số câu hợp lệ là số của toàn đợt và có fallback khi thiếu',()=>{assert.equal(normalizeQuestionList(null).validCount,0);assert.equal(normalizeQuestionList({validCount:'12',items:[]}).validCount,12);});
