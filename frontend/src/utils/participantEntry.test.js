import test from 'node:test';
import assert from 'node:assert/strict';
import {singleEntryRound,enterSingleRound,nextAction} from './participantEntry.js';
const round={id:'round',status:'OPEN',participation:{canStart:true}};
const list=async()=>({items:[round]});
test('only one open round can be entered directly; incomplete pages cannot',()=>{
 assert.equal(singleEntryRound({items:[round]})?.id,'round');
 assert.equal(singleEntryRound({items:[round,round]}),null);
 assert.equal(singleEntryRound({items:[round],pagination:{total:101}}),null);
 assert.equal(singleEntryRound({items:[{...round,status:'CLOSED'}]}),null);
});
test('direct entry starts once, resumes existing attempt and respects backend lock',async()=>{
 let calls=0;const start=async()=>{calls++;return {attempt:{id:'attempt'}};};
 assert.equal(await enterSingleRound({list,start}),'/attempts/attempt');
 assert.equal(calls,1);
 const withParticipation=p=>async()=>({items:[{...round,participation:p}]});
 assert.equal(await enterSingleRound({list:withParticipation({activeAttempt:{id:'old'}}),start}),'/attempts/old');
 await assert.rejects(()=>enterSingleRound({list:withParticipation({canStart:false,reason:'Hết lượt'}),start}),/Hết lượt/);
 assert.equal(calls,1);
 assert.equal(await enterSingleRound({list,start,enabled:false,returnPath:'/exam-rounds/round'}),'/exam-rounds/round');
 assert.equal(await enterSingleRound({list,start,returnPath:'/attempts/old'}),'/attempts/old');
 assert.equal(calls,1);
});
test('last question submits; earlier questions move forward',()=>{
 assert.equal(nextAction(0,1),'submit');assert.equal(nextAction(29,30),'submit');assert.equal(nextAction(28,30),'next');
});

test('selected round goes directly to its attempt without visiting round list',async()=>{
 let requested=null;
 const path=await enterSingleRound({returnPath:'/exam-rounds/round',get:async id=>{requested=id;return round;},list:async()=>{throw Error('must not list');},start:async()=>({attempt:{id:'direct'}})});
 assert.equal(requested,'round');assert.equal(path,'/attempts/direct');
});

test('single public round fetches participation before starting; server availability wins over client clock',async()=>{
 const id='53dab57d-b3bb-41ed-b287-3523d4472302';
 const calls=[];
 const path=await enterSingleRound({
  list:async()=>({items:[{id:'round',status:'OPEN',startAt:'2099-01-01T00:00:00Z'}],pagination:{total:1}}),
  get:async roundId=>{calls.push(['get',roundId]);return round;},
  start:async roundId=>{calls.push(['start',roundId]);return {attempt:{id}};},
 });
 assert.equal(path,`/attempts/${id}`);
 assert.deepEqual(calls,[['get','round'],['start','round']]);
});

test('direct mode never silently falls back to round list when no unique round exists',async()=>{
 for(const items of [[],[round,round]])await assert.rejects(()=>enterSingleRound({list:async()=>({items}),start:async()=>{throw Error('must not start');}}),/Không xác định/);
});
