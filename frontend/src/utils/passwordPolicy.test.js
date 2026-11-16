import test from 'node:test';import assert from 'node:assert/strict';
import {getPasswordProblems,generateStrongPassword,passwordPolicyRuleWithVisibleChecklist,PASSWORD_RULES_SUMMARY_ERROR} from './passwordPolicy.js';
test('Mật khẩu tối thiểu 6 ký tự, cho phép chứa tên tài khoản và dài hơn 72 byte',()=>{
 assert.deepEqual(getPasswordProblems('12345'),['Mật khẩu phải có ít nhất 6 ký tự']);
 for(const password of ['123456','tester','ệ'.repeat(100)])assert.deepEqual(getPasswordProblems(password,{username:'tester'}),[]);
 assert.deepEqual(getPasswordProblems(''),[]);
});
test('Rule checklist từ chối mật khẩu ngắn',async()=>{
 const rule=passwordPolicyRuleWithVisibleChecklist();await assert.rejects(rule.validator(null,'short'),{message:PASSWORD_RULES_SUMMARY_ERROR});await rule.validator(null,'123456');
});
test('Sinh mật khẩu dùng nguồn ngẫu nhiên và giữ độ dài tối thiểu',()=>{
 let calls=0;const getRandomValues=array=>{calls++;array[0]=calls*2654435761;return array;};
 const password=generateStrongPassword({getRandomValues});assert.equal(password.length,16);assert.deepEqual(getPasswordProblems(password),[]);assert.ok(calls>0);assert.equal(generateStrongPassword({length:4}).length,6);
});
