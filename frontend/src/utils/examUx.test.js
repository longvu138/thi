import test from 'node:test';import assert from 'node:assert/strict';
import {attemptProgressLabel,submitConfirmation,filterResultQuestions,canTakeNextAttempt,bestPercentage,roundReadiness} from './examUx.js';
test('Nhãn tiến độ và xác nhận nộp rõ khi đã làm đủ hoặc bỏ trống',()=>{
 assert.equal(attemptProgressLabel(11,30,20),'12/30 · đã làm 20');assert.equal(submitConfirmation(0,30),'Bạn đã trả lời đủ 30 câu');assert.match(submitConfirmation(2,30),/2 câu chưa trả lời/);
});
test('Chỉ hiện thi tiếp khi Backend cho phép, còn lượt đúng chế độ và chưa hết giờ',()=>{
 const round={status:'OPEN',participation:{canStart:true,remainingAttempts:1}};assert.equal(canTakeNextAttempt(round,100),true);
 for(const patch of [{status:'CLOSED'},{endAt:new Date(100).toISOString()},{participation:{canStart:false,remainingAttempts:2}},{participation:{canStart:true,remainingAttempts:0}},{participation:{canStart:true,remainingAttempts:1,activeAttempt:{id:'a'}}}])assert.equal(canTakeNextAttempt({...round,...patch},100),false);
 assert.equal(canTakeNextAttempt({...round,participation:{canStart:true,isTrial:true,remainingAttempts:0,trialRemainingAttempts:1}}),true);
});
test('Lọc sai tách bỏ trống, không dùng đáp án bị ẩn; điểm cao nhất tách lượt thử',()=>{
 const rows=[{selectedAnswer:'A',correctAnswer:'A'},{selectedAnswer:'B',correctAnswer:'A'},{selectedAnswer:null,correctAnswer:'C'}];
 assert.equal(filterResultQuestions(rows,'all',true).length,3);assert.deepEqual(filterResultQuestions(rows,'wrong',true),[rows[1]]);assert.deepEqual(filterResultQuestions(rows,'empty',false),[rows[2]]);assert.deepEqual(filterResultQuestions(rows,'wrong',false),[]);
 assert.equal(bestPercentage([{status:'SUBMITTED',percentage:70},{status:'EXPIRED',percentage:80},{status:'IN_PROGRESS',percentage:100},{status:'SUBMITTED',percentage:99,isTrial:true}]),80);assert.equal(bestPercentage([]),null);
});
test('Checklist chỉ dẫn đúng tab, không coi tổng câu đủ thay cho cơ cấu theo nhóm',()=>{
 const checks=roundReadiness({validQuestionCount:100,questionCount:30,structureSufficient:false,status:'DRAFT'});
 assert.equal(checks[0].ready,true);assert.equal(checks[1].ready,false);assert.equal(checks[1].tab,'structure');assert.equal(checks[2].tab,'overview');assert.equal(checks[4].ready,false);
});
