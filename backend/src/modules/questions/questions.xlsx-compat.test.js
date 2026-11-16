const test=require('node:test'),assert=require('node:assert/strict');
const ExcelJS=require('exceljs');
const {readWorkbook}=require('./questions.excel');
const {normalizeXml}=require('./questions.xlsx-compat');
const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const {prefixedWorkbook}=require('./questions.test-fixtures');
test('Đọc XLSX dùng prefix x ở workbook/styles/sharedStrings/worksheet, giữ nội dung A/B/C',async()=>{
 const file=await prefixedWorkbook();const raw=new ExcelJS.Workbook();await assert.rejects(()=>raw.xlsx.load(file));
 const rows=await readWorkbook(file);assert.equal(rows.length,1);assert.deepEqual(rows[0].errors,[]);assert.equal(rows[0].data.correctAnswer,'C');assert.equal(rows[0].data.optionD,'');assert.equal(rows[0].data.content,'Nội dung <x:si> & "nguyên vẹn"');
});
test('Chuẩn hóa theo URI, giữ namespace khác, thuộc tính, CDATA; không đụng chữ x: trong ô',()=>{
 const source=`<s:sst xmlns:s="${MAIN}" xmlns:r="urn:other"><s:si r:id="abc"><s:t><![CDATA[<s:si> & nguyên vẹn]]></s:t></s:si></s:sst>`;
 const result=normalizeXml(source);assert.equal(result.changed,true);assert.ok(result.xml.includes('r:id="abc"'));assert.ok(result.xml.includes('&lt;s:si&gt; &amp; nguyên vẹn'));assert.equal((result.xml.match(/ xmlns="/g)||[]).length,1);
 assert.throws(()=>normalizeXml('<!DOCTYPE a [<!ENTITY b "x">]><a/>'),{statusCode:422});
});
test('XML sai namespace hoặc hỏng không được biến thành dữ liệu câu hỏi hợp lệ',()=>{
 assert.equal(normalizeXml('<x:workbook xmlns:x="urn:other"/>').changed,false);
 assert.throws(()=>normalizeXml('<x:workbook>'));
});

test('File có namespace vẫn bị chặn công thức trong ô câu hỏi',async()=>{
 const JSZip=require('jszip');const zip=await JSZip.loadAsync(await prefixedWorkbook());const part=zip.file('xl/worksheets/sheet1.xml');const xml=await part.async('string');
 const changed=xml.replace(/<x:c r="C2"[^>]*>[\s\S]*?<\/x:c>/,'<x:c r="C2"><x:f>1+1</x:f><x:v>2</x:v></x:c>');assert.notEqual(changed,xml);zip.file(part.name,changed);
 const rows=await readWorkbook(await zip.generateAsync({type:'nodebuffer'}));assert.ok(rows[0].errors.some(e=>e.includes('công thức')));
});
