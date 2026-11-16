const ExcelJS=require('exceljs'),JSZip=require('jszip');
const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const prefixedWorkbook=async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Câu hỏi');
 sheet.addRow(['ma_cau_hoi','nhom_cau_hoi','noi_dung','lua_chon_a','lua_chon_b','lua_chon_c','lua_chon_d','dap_an_dung']);
 sheet.addRow(['E2E_Q_XML','Nhóm XML','Nội dung <x:si> & "nguyên vẹn"','Một','Hai','Ba','','C']);
 const zip=await JSZip.loadAsync(await book.xlsx.writeBuffer());
 for(const part of Object.values(zip.files).filter(p=>!p.dir&&/^xl\/(workbook\.xml|styles\.xml|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(p.name))){
  const xml=await part.async('string');
  zip.file(part.name,xml.replace(`xmlns="${MAIN}"`,`xmlns:x="${MAIN}"`).replace(/<(\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g,'<$1x:$2'));
 }
 return zip.generateAsync({type:'nodebuffer'});
};
module.exports={prefixedWorkbook};
