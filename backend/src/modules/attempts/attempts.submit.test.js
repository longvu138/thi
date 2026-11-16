const test=require('node:test'),assert=require('node:assert/strict');
const {validateSubmit}=require('./attempts.validator');
const id='11111111-1111-4111-8111-111111111111';
test('submit nhận toàn bộ lựa chọn/null, cho phép body rỗng tương thích, không nhận dữ liệu ngoài hợp đồng',()=>{
 assert.deepEqual(validateSubmit({answers:[{attemptQuestionId:id,selectedAnswer:null}]}),{answers:[{attemptQuestionId:id,selectedAnswer:null}]});assert.deepEqual(validateSubmit({answers:[]}),{answers:[]});assert.deepEqual(validateSubmit({}),{});
 for(const body of [null,{answers:[{attemptQuestionId:id,selectedAnswer:'X'}]},{answers:[{attemptQuestionId:'bad',selectedAnswer:'A'}]},{answers:[{attemptQuestionId:id,selectedAnswer:'A'},{attemptQuestionId:id,selectedAnswer:'B'}]},{answers:[],score:100}])assert.throws(()=>validateSubmit(body),{statusCode:422});
});
