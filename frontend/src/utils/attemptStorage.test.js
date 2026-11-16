import test from 'node:test';import assert from 'node:assert/strict';
import {createSafeStorage} from './safeStorage.js';
import {readDraft,writeDraft,clearDraft,clearAttemptDrafts,mergeDraft,getPosition,setPosition,getAutoAdvance,setAutoAdvance} from './attemptStorage.js';
import {syncDeadline,nextQuestionIndex,resultDestination,BATCH_INTERVAL_MS} from './attempts.js';
const fake=()=>{const map=new Map();const raw={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};return {raw,safe:createSafeStorage(()=>raw),map};};
test('cache chỉ lựa chọn/timestamp/deadline, hết hạn xóa; vị trí và logout xóa đúng phạm vi',()=>{
 const {raw,safe,map}=fake();writeDraft('a',{q:'A'},{q:20},100,safe);assert.deepEqual(Object.keys(JSON.parse(map.get('exam-attempt:a'))).sort(),['answers','deadline','modifiedAt']);assert.equal(readDraft('a',safe,50).answers.q,'A');setPosition('a',2,safe);assert.equal(getPosition('a',safe),2);clearDraft('a',safe);assert.equal(map.size,0);writeDraft('a',{q:'B'},{q:20},100,safe);assert.equal(readDraft('a',safe,101),null);writeDraft('b',{q:'A'},{q:20},200,safe);safe.setItem('other','keep');clearAttemptDrafts(raw);assert.deepEqual([...map],[['other','keep']]);
});
test('merge bản máy mới hơn, Backend mới hơn thắng; bằng đáp án không cần gửi lại, bỏ ID ngoài đề',()=>{
 const attempt={questions:[{id:'a',selectedAnswer:'A',answerUpdatedAt:new Date(10).toISOString()},{id:'b',selectedAnswer:'B',answerUpdatedAt:new Date(30).toISOString()},{id:'c',selectedAnswer:null}]};
 const merged=mergeDraft(attempt,{answers:{a:'B',b:'A',c:null,outside:'D'},modifiedAt:{a:20,b:20,c:20,outside:20}});assert.deepEqual(merged.selected,{a:'B',b:'B',c:null});assert.deepEqual(merged.pending,{a:'B'});
});
test('đồng hồ chỉ chỉnh lệch >2s, nhịp lô 30s, kết quả replace route và tự sang câu theo cài đặt',()=>{
 assert.equal(syncDeadline(10000,11999),10000);assert.equal(syncDeadline(10000,12001),12001);assert.equal(BATCH_INTERVAL_MS,30000);assert.equal(resultDestination('a'),'/attempts/a/result');assert.equal(nextQuestionIndex(1,3,true,'A'),2);assert.equal(nextQuestionIndex(2,3,true,'B'),2);assert.equal(nextQuestionIndex(1,3,true,null),1);assert.equal(nextQuestionIndex(1,3,false,'A'),1);const {safe}=fake();assert.equal(getAutoAdvance(true,safe),true);setAutoAdvance(false,safe);assert.equal(getAutoAdvance(true,safe),false);
});

test('session khôi phục cache, đưa vào hàng đợi và xóa khi nộp/chốt/hết hạn',async()=>{
 const {createAttemptSession}=await import('./attemptSession.js');const {safe,map}=fake();
 const receipt=(status,answer=null)=>({attempt:{id:'a',status,serverTime:new Date(50).toISOString(),expiresAt:new Date(1000).toISOString(),questions:[{id:'q',selectedAnswer:answer,options:[{key:'A'}]}]},deadline:1000});
 writeDraft('a',{q:'A'},{q:40},1000,safe);const session=createAttemptSession({id:'a',now:()=>50,storage:safe,save:async()=>{},submit:async()=>receipt('SUBMITTED','A'),load:async()=>receipt('EXPIRED')});session.reconcile(receipt('IN_PROGRESS'));assert.equal(session.getSnapshot().pendingCount,1);await session.finish();assert.equal(map.has('exam-attempt:a'),false);
 const second=createAttemptSession({id:'a',now:()=>50,storage:safe,save:async()=>{},submit:async()=>receipt('SUBMITTED'),load:async()=>receipt('EXPIRED')});second.reconcile(receipt('IN_PROGRESS'));second.choose('q','A');assert.equal(map.has('exam-attempt:a'),true);second.expireStorage();assert.equal(map.has('exam-attempt:a'),false);second.reconcile(receipt('EXPIRED'));assert.equal(map.has('exam-attempt:a'),false);
});
