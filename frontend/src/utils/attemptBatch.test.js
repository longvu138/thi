import test from 'node:test';import assert from 'node:assert/strict';import {startBatchLoop} from './attemptBatch.js';
test('không gửi theo từng click, mỗi nhịp 30s chỉ gửi khi có thay đổi/online/chưa nộp',()=>{
 let tick,delay,sent=0,online=true,cancelled=false;const state={pendingCount:1,submitting:false};const stop=startBatchLoop({session:{getSnapshot:()=>state,flush:()=>sent++},online:()=>online,schedule:(callback,ms)=>{tick=callback;delay=ms;return 1;},cancel:()=>cancelled=true});
 assert.equal(delay,30000);assert.equal(sent,0);tick();assert.equal(sent,1);online=false;tick();assert.equal(sent,1);online=true;state.submitting=true;tick();assert.equal(sent,1);state.submitting=false;state.pendingCount=0;tick();assert.equal(sent,1);stop();assert.equal(cancelled,true);
});
