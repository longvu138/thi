const test = require('node:test'); const assert = require('node:assert/strict');
const { grade, snapshotQuestion, modeFor } = require('./attempts.logic');
const { validateAnswers } = require('./attempts.validator');
test('Chấm ngưỡng 70% dùng số nguyên: 14/20 đạt, 13/20 không đạt', () => {
 const qs = Array.from({length:20},(_,i)=>({id:String(i),correct_answer:'A'}));
 for (const [count,result] of [[14,'PASS'],[13,'FAIL']]) {const score=grade(qs,qs.slice(0,count).map(q=>({attempt_question_id:q.id,selected_answer:'A'})),{questionCount:20,passingPercentage:70});assert.equal(score.result,result);assert.equal(score.unansweredCount,20-count);}
});
test('Xáo trộn vẫn ánh xạ đúng khóa gốc; cờ không xáo trộn giữ thứ tự', () => {
 const row={content:'Test',option_a:'Một',option_b:'Hai',option_c:'Ba',correct_answer:'A',allow_shuffle_options:1};
 const snap=snapshotQuestion(row,true,()=>0);assert.equal(snap.options.find(x=>x.key===snap.correctAnswer).originalKey,'A');
 assert.deepEqual(snapshotQuestion({...row,allow_shuffle_options:0},true,()=>0).options.map(x=>x.originalKey),['A','B','C']);
});
test('Chạy thử và chính thức tách thời gian, hết giờ hoặc đóng bị chặn', () => {
 const round={status:'OPEN',trial_start_at:'2026-11-11 01:00:00',start_at:'2026-11-11 02:00:00',end_at:'2026-11-11 03:00:00'};
 assert.equal(modeFor(round,Date.parse('2026-11-11T01:30:00Z')),true);assert.equal(modeFor(round,Date.parse('2026-11-11T02:00:00Z')),false);
 assert.throws(()=>modeFor(round,Date.parse('2026-11-11T03:00:00Z')),{statusCode:409});assert.throws(()=>modeFor({...round,status:'CLOSED'},Date.now()),{statusCode:409});
});
test('Không nhận đáp án thiếu trường, trùng câu hoặc tự truyền đáp án đúng',()=>{
 for(const body of [{},{answers:[]},{answers:[{attemptQuestionId:'invalid',selectedAnswer:'A'}]},{answers:[{attemptQuestionId:'11111111-1111-4111-8111-111111111111',selectedAnswer:'A',correctAnswer:'A'}]}])assert.throws(()=>validateAnswers(body),{statusCode:422});
});
