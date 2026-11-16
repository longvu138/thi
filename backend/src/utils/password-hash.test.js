const test=require('node:test');
const assert=require('node:assert/strict');
const {hashPassword,verifyPassword}=require('./password-hash');
test('Argon2id kiểm tra đúng sai mật khẩu và tài khoản không tồn tại',async()=>{
 const hash=await hashPassword('secret-password'); assert.match(hash,/^\$argon2id\$/);
 assert.equal(await verifyPassword('secret-password',hash),true);
 assert.equal(await verifyPassword('wrong',hash),false);
 assert.equal(await verifyPassword('wrong',null),false);
});
