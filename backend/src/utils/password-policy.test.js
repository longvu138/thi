const test=require('node:test');const assert=require('node:assert/strict');
const {validatePassword,assertPasswordPolicy}=require('./password-policy');
test('Mật khẩu tối thiểu 6 ký tự và không giới hạn theo tên tài khoản hoặc 72 byte',()=>{
 assert.equal(validatePassword('12345').valid,false);
 for(const value of ['123456','tester','ệ'.repeat(100)])assert.equal(validatePassword(value,{username:'tester'}).valid,true);
 assert.throws(()=>assertPasswordPolicy('short'),{statusCode:422,code:'PASSWORD_POLICY_FAILED'});
});
