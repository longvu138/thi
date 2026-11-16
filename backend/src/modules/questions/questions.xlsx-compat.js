const JSZip=require('jszip');
const {SaxesParser}=require('saxes');
const {httpError}=require('../../utils/http-error');
const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const MAX_XML_BYTES=20*1024*1024;
const escapeText=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escapeAttribute=value=>escapeText(value).replace(/"/g,'&quot;').replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');
// ExcelJS nhận tên workbook/worksheet không có prefix. Chỉ chuẩn hóa tên thẻ
// SpreadsheetML theo URI, giữ namespace khác, thuộc tính và nội dung ô.
const normalizeXml=source=>{
 const parser=new SaxesParser({xmlns:true});const output=['<?xml version="1.0" encoding="UTF-8"?>'],defaults=[''];let changed=false;
 parser.on('doctype',()=>{throw httpError(422,'File Excel không được chứa khai báo DTD');});
 parser.on('opentag',node=>{
  const main=node.uri===MAIN;const name=main?node.local:node.name;
  const parentDefault=defaults.at(-1);
  defaults.push(main?MAIN:node.attributes.xmlns?.value??parentDefault);
  if(main&&node.prefix)changed=true;
  output.push(`<${name}`);
  for(const attr of Object.values(node.attributes)){
   if(main&&attr.name==='xmlns')continue;
   output.push(` ${attr.name}="${escapeAttribute(attr.value)}"`);
  }
  if(main&&parentDefault!==MAIN)output.push(` xmlns="${MAIN}"`);
  output.push('>');
 });
 parser.on('closetag',node=>{output.push(`</${node.uri===MAIN?node.local:node.name}>`);defaults.pop();});
 parser.on('text',value=>output.push(escapeText(value)));
 parser.on('cdata',value=>output.push(escapeText(value)));
 parser.write(source).close();return {xml:output.join(''),changed};
};
const normalizeWorkbook=async buffer=>{
 const zip=await JSZip.loadAsync(buffer);const parts=Object.values(zip.files).filter(entry=>!entry.dir&&/^xl\/(workbook\.xml|styles\.xml|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(entry.name));
 let bytes=0,changed=false;
 for(const entry of parts){
  // Metadata kích thước được đọc từ ZIP để chặn giải nén phần XML quá lớn.
  bytes+=Number(entry._data?.uncompressedSize||0);
  if(bytes>MAX_XML_BYTES)throw httpError(422,'Nội dung XML trong Excel vượt quá 20 MB');
  const source=await entry.async('string');
  const result=normalizeXml(source);if(result.changed){zip.file(entry.name,result.xml);changed=true;}
 }
 if(!changed)throw httpError(422,'Không đọc được file Excel, vui lòng kiểm tra lại');
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
};
module.exports={normalizeWorkbook,normalizeXml};
