const test=require('node:test');
const assert=require('node:assert/strict');
const ExcelJS=require('exceljs');
const {validateQuestion}=require('./questions.validator');
const {readWorkbook,template,previewToken,verifyPreview}=require('./questions.excel');
process.env.CSRF_SECRET='questions-unit-test-secret';
const question={questionCode:'E2E_Q_1',category:'Nhóm test',content:'Nội dung test',optionA:'Một',optionB:'Hai',correctAnswer:'A'};
test('Câu hỏi có 2 đến 4 lựa chọn và mặc định cho phép xáo trộn',()=>{
 for(const extras of [{},{optionC:'Ba',correctAnswer:'C'},{optionC:'Ba',optionD:'Bốn',correctAnswer:'D',allowShuffleOptions:false}]) assert.equal(validateQuestion({...question,...extras}).allowShuffleOptions,extras.allowShuffleOptions??true);
});
test('Từ chối thiếu trường, đáp án không tồn tại và sai kiểu xáo trộn',()=>{
 for(const changes of [{content:''},{optionB:''},{correctAnswer:'C'},{correctAnswer:'X'},{optionD:'Bốn'},{allowShuffleOptions:'false'}]) assert.throws(()=>validateQuestion({...question,...changes}),{statusCode:422});
});
test('Mẫu Excel rỗng có hướng dẫn tiếng Việt và đúng tên cột',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await template());assert.equal(book.worksheets[0].getCell('A1').value,'ma_cau_hoi');assert.equal(book.worksheets[1].name,'Hướng dẫn');
});
test('Import báo thiếu cột và từ chối file giả Excel',async()=>{
 await assert.rejects(()=>readWorkbook(Buffer.from('not-xlsx')),{statusCode:422});
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Câu hỏi');sheet.addRow(['question_code']);sheet.addRow(['E2E_Q_1']);
 await assert.rejects(()=>readWorkbookBuffer(book),{statusCode:422});
});
async function readWorkbookBuffer(book){return readWorkbook(await book.xlsx.writeBuffer());}
test('Excel báo lỗi theo dòng: trùng mã, đáp án sai; giữ cờ không xáo trộn',async()=>{
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Câu hỏi');
 sheet.addRow(['question_code','category','content','option_a','option_b','option_c','option_d','correct_answer','allow_shuffle_options']);
 sheet.addRow(['E2E_Q_1','Nhóm test','Nội dung','Một','Hai','','','A',false]);sheet.addRow(['e2e_q_1','Nhóm test','Nội dung','Một','Hai','','','D']);
 const rows=await readWorkbookBuffer(book);assert.equal(rows[0].data.allowShuffleOptions,false);assert.equal(rows[0].errors.length,0);assert.equal(rows[1].rowNumber,3);assert.equal(rows[1].errors.length,2);
});
test('Mã xác nhận ràng buộc file, người dùng, chữ ký và hạn dùng',()=>{
 const buffer=Buffer.from('file');const token=previewToken(buffer,'admin',1000);verifyPreview(token,buffer,'admin',1001);
 for(const args of [[token,Buffer.from('changed'),'admin',1001],[token,buffer,'other',1001],[token+'x',buffer,'admin',1001]]) assert.throws(()=>verifyPreview(...args),{statusCode:422});
 assert.throws(()=>verifyPreview(token,buffer,'admin',901000),{statusCode:409});
});

test('Mẫu câu hỏi có chín cột tiếng Việt và import ánh xạ đúng khi đổi thứ tự',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await template());
 assert.deepEqual(book.worksheets[0].getRow(1).values.slice(1),['ma_cau_hoi','nhom_cau_hoi','noi_dung','lua_chon_a','lua_chon_b','lua_chon_c','lua_chon_d','dap_an_dung','cho_phep_xao_tron']);
 const sheet=book.worksheets[0];sheet.addRow(['E2E_Q_VI','Nhóm test','Nội dung','Một','Hai','','','B',false]);
 const rows=await readWorkbookBuffer(book);assert.equal(rows[0].errors.length,0);assert.equal(rows[0].data.questionCode,'E2E_Q_VI');assert.equal(rows[0].data.correctAnswer,'B');assert.equal(rows[0].data.allowShuffleOptions,false);
 const values=sheet.getRow(1).values.slice(1);[values[0],values[1]]=[values[1],values[0]];sheet.getRow(1).values=values;
 sheet.getRow(2).values=['Nhóm mới','E2E_Q_REORDER','Nội dung','Một','Hai','','','A',true];
 const reordered=await readWorkbookBuffer(book);assert.equal(reordered[0].data.questionCode,'E2E_Q_REORDER');assert.equal(reordered[0].data.category,'Nhóm mới');assert.equal(reordered[0].errors.length,0);
});
test('Từ chối tên cột trùng nhau sau khi ánh xạ mẫu mới và cũ',async()=>{
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Câu hỏi');sheet.addRow(['ma_cau_hoi','question_code']);sheet.addRow(['E2E_Q_1','E2E_Q_2']);
 await assert.rejects(()=>readWorkbookBuffer(book),{statusCode:422});
});


test('Import A/B/C được bỏ hẳn cột D, cả mẫu tiếng Việt và tiếng Anh',async()=>{
 for(const headers of [
  ['ma_cau_hoi','nhom_cau_hoi','noi_dung','lua_chon_a','lua_chon_b','lua_chon_c','dap_an_dung'],
  ['question_code','category','content','option_a','option_b','option_c','correct_answer'],
 ]){
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Câu hỏi');sheet.addRow(headers);sheet.addRow(['E2E_Q_ABC','Nhóm','Nội dung','Một','Hai','Ba','C']);
  const [row]=await readWorkbookBuffer(book);assert.deepEqual(row.errors,[]);assert.equal(row.data.optionC,'Ba');assert.equal(row.data.optionD,'');assert.equal(row.data.correctAnswer,'C');
 }
});
test('Import A/B bỏ cột C/D; vẫn chặn đáp án không tồn tại và D thiếu C',async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Câu hỏi');sheet.addRow(['dap_an_dung','lua_chon_b','noi_dung','ma_cau_hoi','nhom_cau_hoi','lua_chon_a']);
 sheet.addRow(['B','Hai','Nội dung','E2E_Q_AB','Nhóm','Một']);sheet.addRow(['D','Hai','Nội dung','E2E_Q_BAD','Nhóm','Một']);
 const rows=await readWorkbookBuffer(book);assert.deepEqual(rows[0].errors,[]);assert.equal(rows[0].data.optionC,'');assert.equal(rows[0].data.optionD,'');assert.equal(rows[1].errors.length,1);
 const bad=new ExcelJS.Workbook(),s=bad.addWorksheet('Câu hỏi');s.addRow(['question_code','category','content','option_a','option_b','option_d','correct_answer']);s.addRow(['E2E_Q_D','Nhóm','Nội dung','Một','Hai','Bốn','D']);
 assert.equal((await readWorkbookBuffer(bad))[0].errors.length,1);
});
