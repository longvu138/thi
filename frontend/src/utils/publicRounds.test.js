import test from 'node:test';
import assert from 'node:assert/strict';
import {publicRoundState} from './publicRounds.js';
const now=Date.parse('2026-11-13T00:00:00Z');
const round={status:'OPEN',startAt:new Date(now-1000).toISOString(),endAt:new Date(now+90061000).toISOString()};
test('đợt mở đếm ngược ngày/giờ, đúng biên kết thúc',()=>{assert.equal(publicRoundState(round,now).countdown,'1 ngày 01:01:01');assert.equal(publicRoundState(round,now).open,true);assert.equal(publicRoundState(round,now+90061000).open,false);});
test('ẩn đóng/nháp/tương lai, chạy thử đếm tới giờ chính thức',()=>{for(const status of ['CLOSED','DRAFT'])assert.equal(publicRoundState({...round,status},now).open,false);const future={...round,startAt:new Date(now+10000).toISOString()};assert.equal(publicRoundState(future,now).open,false);const trial=publicRoundState({...future,trialStartAt:new Date(now-1000).toISOString()},now);assert.equal(trial.open,true);assert.equal(trial.isTrial,true);assert.equal(trial.countdown,'00:00:10');});
test('nhiều đợt đồng thời và đợt không giới hạn thời gian',()=>{assert.equal([round,{status:'OPEN'}].filter(r=>publicRoundState(r,now).open).length,2);assert.equal(publicRoundState({status:'OPEN'},now).countdown,'Không giới hạn thời gian mở');});
