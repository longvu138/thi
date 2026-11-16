const test=require('node:test');const assert=require('node:assert/strict');const ExcelJS=require('exceljs');
const {readUsers,template,tokenFor,verifyToken}=require('./users.excel');
process.env.CSRF_SECRET='users-excel-unit-test-secret';
const file=async(headers,rows)=>{const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Tài khoản');sheet.addRow(headers);for(const row of rows)sheet.addRow(row);return book.xlsx.writeBuffer();};
test('Excel tài khoản giữ số 0 đầu và mật khẩu 6 ký tự, mặc định USER',async()=>{
 const rows=await readUsers(await file(['ten_dang_nhap','ho_ten','mat_khau'],[['e2e_test','Tên test','012345']]));assert.equal(rows[0].errors.length,0);assert.equal(rows[0].data.password,'012345');assert.equal(rows[0].data.role,'USER');
});
test('Excel báo thiếu cột, trùng tài khoản, sai vai trò và mật khẩu ngắn',async()=>{
 await assert.rejects(async()=>readUsers(await file(['ten_dang_nhap'],[['e2e_test']])),{statusCode:422});
 const rows=await readUsers(await file(['ten_dang_nhap','ho_ten','mat_khau','vai_tro'],[['e2e_test','Tên','123456','USER'],['E2E_TEST','Tên','short','ROOT']]));assert.ok(rows[1].errors.length);assert.ok(rows[1].errors.includes('Tài khoản trùng trong file'));
});
test('Excel từ chối mật khẩu dạng số để tránh mất số 0 đầu',async()=>{
 const rows=await readUsers(await file(['ten_dang_nhap','ho_ten','mat_khau'],[['e2e_test','Tên',123456]]));assert.ok(rows[0].errors.length);
});
test('Mẫu tài khoản có hướng dẫn và token gắn đúng file, người và thời hạn',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await template());assert.equal(book.worksheets[0].getCell('C1').value,'mat_khau');
 const buffer=Buffer.from('file');const token=tokenFor(buffer,'admin');verifyToken(token,buffer,'admin');assert.throws(()=>verifyToken(token,buffer,'other'),{statusCode:422});assert.throws(()=>verifyToken(token,Buffer.from('other'),'admin'),{statusCode:422});assert.throws(()=>verifyToken(token+'x',buffer,'admin'),{statusCode:422});assert.throws(()=>verifyToken(tokenFor(buffer,'admin',0),buffer,'admin'),{statusCode:409});
});

test('Mẫu dùng đủ năm cột tiếng Việt và ánh xạ đúng dữ liệu nội bộ',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await template());
 assert.deepEqual(book.worksheets[0].getRow(1).values.slice(1),['ten_dang_nhap','ho_ten','mat_khau','vai_tro','hoat_dong']);
 const rows=await readUsers(await file(['ho_ten','mat_khau','ten_dang_nhap','hoat_dong','vai_tro'],[['Tên test','012345','e2e_viet',false,'ADMIN']]));
 assert.equal(rows[0].errors.length,0);assert.equal(rows[0].data.username,'e2e_viet');assert.equal(rows[0].data.full_name,'Tên test');assert.equal(rows[0].data.role,'ADMIN');assert.equal(rows[0].data.is_active,0);
});
test('Tiếp tục đọc mẫu cũ và từ chối cột trùng sau ánh xạ',async()=>{
 const rows=await readUsers(await file(['username','full_name','password'],[['e2e_old','Tên test','012345']]));assert.equal(rows[0].errors.length,0);
 await assert.rejects(async()=>readUsers(await file(['username','ten_dang_nhap','ho_ten','mat_khau'],[['e2e_old','e2e_new','Tên test','012345']])),{statusCode:422});
});
