const test = require('node:test');
const assert = require('node:assert/strict');
const {validateUser} = require('./users.validator');
test('Tạo tài khoản chuẩn hóa họ tên và dùng vai trò USER mặc định',()=>{
  const result=validateUser({username:'tester',fullName:' Họ tên ',password:'secret-valid-123'},true);
  assert.equal(result.full_name,'Họ tên'); assert.equal(result.role,'USER');
});
test('Từ chối thiếu dữ liệu, mật khẩu yếu, sai vai trò và trường ngoài phạm vi',()=>{
  for (const body of [{},{username:'tester',fullName:'Tên',password:'short'},{role:'ROOT'},{isActive:'false'},{username:'changed'},{password:null}]) {
    assert.throws(()=>validateUser(body,false,'tester'),{statusCode:422});
  }
});
test('Cho phép mật khẩu 6 ký tự chứa tên tài khoản khi chỉnh sửa',()=>{
 assert.equal(validateUser({password:'tester'},false,'tester').password,'tester');
});
