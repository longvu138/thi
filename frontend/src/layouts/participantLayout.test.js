import test from 'node:test';
import assert from 'node:assert/strict';
import {usesParticipantLayout,isTakingAttempt} from './participantLayoutRules.js';
test('Người dự thi dùng cổng riêng, ADMIN giữ khung quản trị',()=>{
 assert.equal(usesParticipantLayout({role:'USER'}),true);
 assert.equal(usesParticipantLayout({role:'ADMIN'}),false);
 assert.equal(usesParticipantLayout(null),false);
});
test('Khung làm bài không hiện liên kết rời bài, trang kết quả có điều hướng',()=>{
 assert.equal(isTakingAttempt('/attempts/abc'),true);
 assert.equal(isTakingAttempt('/attempts/abc/result'),false);
 assert.equal(isTakingAttempt('/exam-rounds'),false);
});
