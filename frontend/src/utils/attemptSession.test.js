import test from 'node:test';import assert from 'node:assert/strict';
import {createAttemptSession} from './attemptSession.js';
const receipt=(status='IN_PROGRESS',answer=null)=>({attempt:{id:'a',status,serverTime:new Date(10000).toISOString(),expiresAt:new Date(100000).toISOString(),questions:[{id:'q',selectedAnswer:answer,options:[{key:'A'},{key:'B'}]}]},deadline:90000});
const make=options=>{const session=createAttemptSession({now:()=>10000,save:async()=>{},submit:async body=>receipt('SUBMITTED',body.answers[0].selectedAnswer),load:async()=>receipt(),wait:async()=>{},...options});session.reconcile(receipt());return session;};
test('chọn cập nhật ngay, chưa gửi cho tới nhịp lô; request cũ không xóa chỉnh sửa mới',async()=>{
 let release;const sent=[];const s=make({save:async body=>{sent.push(body.answers[0].selectedAnswer);if(sent.length===1)await new Promise(r=>release=r);}});s.choose('q','A');assert.equal(sent.length,0);const flush=s.flush();s.choose('q','B');release();await flush;assert.deepEqual(sent,['A']);assert.equal(s.getSnapshot().pendingCount,1);await s.flush();assert.deepEqual(sent,['A','B']);assert.equal(s.getSnapshot().pendingCount,0);
});
test('lô lỗi giữ hàng đợi, nộp gửi toàn bộ không chờ lô lưu',async()=>{
 let body;const s=make({save:async()=>{throw new Error('offline');},submit:async value=>{body=value;return receipt('SUBMITTED','B');}});s.choose('q','B');await s.flush();assert.equal(s.getSnapshot().pendingCount,1);await s.finish();assert.deepEqual(body,{answers:[{attemptQuestionId:'q',selectedAnswer:'B'}]});assert.equal(s.getSnapshot().attempt.status,'SUBMITTED');
});
test('submit tự thử ba lần, giãn cách, nộp lại thành công và không sửa khi đang nộp',async()=>{
 let offline=true,calls=0;const delays=[];const s=make({wait:async ms=>delays.push(ms),submit:async()=>{calls++;if(offline)throw new Error('offline');return receipt('SUBMITTED');}});await assert.rejects(s.finish());assert.equal(calls,3);assert.deepEqual(delays,[1000,2000]);assert.ok(s.getSnapshot().submitError);offline=false;await s.finish();assert.equal(s.getSnapshot().submitError,null);
 let release;const a=make({submit:async()=>{await new Promise(r=>release=r);return receipt('SUBMITTED');}});const f=a.finish();a.choose('q','B');assert.equal(a.getSnapshot().pendingCount,0);release();await f;a.reconcile(receipt());assert.equal(a.getSnapshot().attempt.status,'SUBMITTED');
});
test('409 đọc trạng thái đã chốt, cảnh báo lựa chọn chưa được ghi; không retry 422',async()=>{
 let calls=0;const s=make({submit:async()=>{calls++;throw {response:{status:409}};},load:async()=>receipt('EXPIRED')});s.choose('q','B');await s.finish();assert.equal(calls,1);assert.equal(s.getSnapshot().unrecordedCount,1);
 const x=make({submit:async()=>{throw {response:{status:422}};}});await assert.rejects(x.finish());assert.equal(x.getSnapshot().attempt.status,'IN_PROGRESS');
});
test('refetch cũ không đè lựa chọn, gửi keepalive và phản hồi mất nhưng server đã nhận không báo mất',async()=>{
 let option;const s=make({save:async(_,opts)=>option=opts});s.choose('q','A');s.reconcile(receipt());assert.equal(s.getSnapshot().selected.q,'A');await s.flush(true);assert.equal(option.keepalive,true);s.reconcile(receipt('EXPIRED','A'));assert.equal(s.getSnapshot().unrecordedCount,0);
});
test('pause không gửi dưới phiên khác hoặc ghi cache sau logout',async()=>{
 let calls=0;const s=make({submit:async()=>{calls++;return receipt('SUBMITTED');}});s.pause();s.choose('q','A');await s.finish();assert.equal(calls,0);assert.equal(s.getSnapshot().pendingCount,0);
});

test('GET xác nhận đáp án đã nhận sau mất phản hồi thì không gửi lại',async()=>{
 let calls=0;const s=make({save:async()=>{calls++;throw new Error('mất phản hồi');}});s.choose('q','A');await s.flush();assert.equal(s.getSnapshot().pendingCount,1);s.reconcile(receipt('IN_PROGRESS','A'));assert.equal(s.getSnapshot().pendingCount,0);await s.flush();assert.equal(calls,1);
});

test('GET chậm không đè lựa chọn mới đã được lưu, nộp vẫn gửi lựa chọn mới nhất',async()=>{
 let now=10000,body;const s=make({now:()=>now,submit:async value=>{body=value;return receipt('SUBMITTED','B');}});
 s.choose('q','A');await s.flush();now=10100;s.choose('q','B');await s.flush();
 const stale=receipt('IN_PROGRESS','A');stale.attempt.questions[0].answerUpdatedAt=new Date(10500).toISOString();
 s.reconcile(stale);assert.equal(s.getSnapshot().selected.q,'B');
 await s.finish();assert.equal(body.answers[0].selectedAnswer,'B');
});
test('phản hồi đã chốt vẫn lấy kết quả server dù khác lựa chọn trong phiên',async()=>{
 const s=make();s.choose('q','B');await s.flush();s.reconcile(receipt('EXPIRED','A'));
 assert.equal(s.getSnapshot().selected.q,'A');assert.equal(s.getSnapshot().attempt.status,'EXPIRED');
});
