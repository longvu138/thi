import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUsers,userPayload} from './users.js';
test('Danh sách tài khoản có fallback an toàn',()=>{
 assert.deepEqual(normalizeUsers(null),{items:[],pagination:{page:1,limit:20,total:0}});
 assert.deepEqual(normalizeUsers({items:[null,{id:'1'}]}).items,[{id:'1'}]);
});
test('Không gửi mật khẩu rỗng khi sửa tài khoản',()=>{
 assert.equal('password' in userPayload({fullName:'Tên',role:'USER',isActive:true,password:''}),false);
});

import {normalizeUserPreview,canImportUsers} from './users.js';
test('Preview tài khoản loại bỏ mật khẩu và chỉ xác nhận dữ liệu hợp lệ',()=>{
 const preview=normalizeUserPreview({rows:[{data:{username:'test',password:'secret'}}]});assert.equal('password' in preview.rows[0].data,false);assert.equal(canImportUsers(null),false);assert.equal(canImportUsers({total:1,validCount:1,errorCount:0,previewToken:'signed'}),true);
});
