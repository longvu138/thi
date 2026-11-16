import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeResult, normalizeResults, durationLabel, resultLabel } from './results.js';
test('Kết quả null an toàn và không làm lộ originalKey hoặc đáp án khi chưa kết thúc', () => {
 assert.deepEqual(normalizeResult(null).questions, []);
 const value={status:'IN_PROGRESS',config:{showCorrectAnswers:true},questions:[{id:'q',correctAnswer:'B',options:[{key:'B',originalKey:'A',content:'Đúng'}]}]};
 assert.equal(normalizeResult(value).questions[0].correctAnswer, undefined);
 assert.equal(normalizeResult(value).questions[0].options[0].originalKey, undefined);
});
test('Chỉ hiển thị đáp án khi snapshot bật và lượt kết thúc', () => {
 for(const status of ['SUBMITTED','EXPIRED'])for(const showCorrectAnswers of [true,false]) {
 const row=normalizeResult({status,config:{showCorrectAnswers},questions:[{correctAnswer:'A',selectedAnswer:'B'}]});
 assert.equal(row.questions[0].correctAnswer,showCorrectAnswers?'A':undefined);
 assert.equal(row.questions[0].selectedAnswer,'B');
 }
});
test('Lịch sử có fallback và thời lượng, nhãn tiếng Việt', () => {
 assert.deepEqual(normalizeResults({items:null}).items,[]);
 assert.equal(durationLabel(125),'2 phút 5 giây');assert.equal(resultLabel('NOT_STARTED'),'Chưa thi');
});
test('ADMIN được xem đáp án snapshot khi cờ hiển thị USER tắt, USER vẫn bị ẩn',()=>{
 const data={status:'SUBMITTED',config:{showCorrectAnswers:false},questions:[{id:'q',correctAnswer:'B',options:[{key:'A',content:'Một',originalKey:'B'}]}]};
 assert.equal(normalizeResult(data).questions[0].correctAnswer,undefined);assert.equal(normalizeResult(data,{admin:true}).questions[0].correctAnswer,'B');assert.equal(Object.hasOwn(normalizeResult(data,{admin:true}).questions[0].options[0],'originalKey'),false);
});
