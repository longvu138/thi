import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldWarnAttemptLeave,preventAttemptUnload} from './attemptLeave.js';
test('Điều hướng nội bộ hỏi khi đang làm; F5 không hỏi dù đang làm',()=>{
 for(const status of ['IN_PROGRESS','SUBMITTED','EXPIRED',undefined]){
  let prevented=false;const event={preventDefault:()=>{prevented=true;}};
  preventAttemptUnload(event,false);
  assert.equal(prevented,false);
  assert.equal(shouldWarnAttemptLeave(status),status==='IN_PROGRESS');
  assert.equal(event.returnValue,undefined);
 }
});

test('Chỉ cảnh báo đóng tab/F5 khi đang nộp bài',()=>{let blocked=false;const event={preventDefault:()=>blocked=true};preventAttemptUnload(event,true);assert.equal(blocked,true);assert.equal(event.returnValue,'');});
