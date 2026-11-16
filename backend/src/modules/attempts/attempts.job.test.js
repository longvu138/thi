const test = require('node:test'); const assert = require('node:assert/strict');
const { startExpiryJob } = require('./attempts.job');
test('Job hết giờ không chạy chồng, unref và chờ kết thúc khi dừng', async () => {
 let callback; let calls=0; let release; let unref=0; let cleared=0;
 const job=startExpiryJob({env:{},schedule:fn=>{callback=fn;return {unref:()=>unref++};},unschedule:()=>cleared++,expire:()=>{calls++;return new Promise(resolve=>{release=resolve;});}});
 callback();callback();await Promise.resolve();assert.equal(calls,1);assert.equal(unref,1);
 const stopped=job.stop();release();await stopped;callback();assert.equal(calls,1);assert.equal(cleared,1);
});
test('Job tắt trong test hoặc khi biến môi trường yêu cầu',async()=>{
 for(const env of [{NODE_ENV:'test'},{NODE_TEST_CONTEXT:'child-v8'},{ATTEMPT_EXPIRY_JOB_ENABLED:'false'}])await startExpiryJob({env,schedule:()=>assert.fail('Không được tạo timer')}).stop();
});
test('Job lặp 10 lô 100 để chốt 1000 lượt, dừng khi hết',async()=>{
 let tick,calls=0;const job=startExpiryJob({env:{},now:()=>0,schedule:fn=>{tick=fn;return {unref(){}};},unschedule(){},expire:async({batchSize})=>{assert.equal(batchSize,100);calls++;return calls<=10?100:0;}});
 tick();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,11);await job.stop();
});
test('Job dừng theo ngân sách thời gian và không tiếp tục khi stop',async()=>{
 let tick,calls=0,time=0;const job=startExpiryJob({env:{ATTEMPT_EXPIRY_MAX_RUN_MS:'200'},now:()=>time,schedule:fn=>{tick=fn;return {unref(){}};},unschedule(){},expire:async()=>{calls++;time+=100;return 100;}});
 tick();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,2);await job.stop();
});
