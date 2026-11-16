const ExcelJS = require('exceljs');
const crypto = require('node:crypto');
const {httpError} = require('../../utils/http-error');
const {validateQuestion} = require('./questions.validator');
const COLUMNS = ['question_code','category','content','option_a','option_b','option_c','option_d','correct_answer'];
const COLUMN_NAMES = {'question_code': 'ma_cau_hoi', 'category': 'nhom_cau_hoi', 'content': 'noi_dung', 'option_a': 'lua_chon_a', 'option_b': 'lua_chon_b', 'option_c': 'lua_chon_c', 'option_d': 'lua_chon_d', 'correct_answer': 'dap_an_dung', 'allow_shuffle_options': 'cho_phep_xao_tron'};
const COLUMN_KEYS = Object.fromEntries(Object.entries(COLUMN_NAMES).map(([key,label])=>[label,key]));
const KEYS = ['questionCode','category','content','optionA','optionB','optionC','optionD','correctAnswer'];
const MAX_ROWS = 500;
const text = cell => {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw httpError(422,'Ô phải là văn bản hoặc số, không dùng công thức, liên kết hay định dạng đặc biệt');
};
const readWorkbook = async buffer => {
  const {fileTypeFromBuffer} = await import('file-type');
  let type;
  try {type = await fileTypeFromBuffer(buffer);} catch {throw httpError(422,'Không đọc được định dạng file Excel');}
  if (type?.ext !== 'xlsx') throw httpError(422,'Vui lòng chọn file Excel .xlsx hợp lệ');
  const workbook = new ExcelJS.Workbook();
  try {await workbook.xlsx.load(buffer);} catch {
    try {
      const {normalizeWorkbook}=require('./questions.xlsx-compat');
      await workbook.xlsx.load(await normalizeWorkbook(buffer));
    } catch(error) {
      if(error.statusCode===422)throw error;
      throw httpError(422,'Không đọc được file Excel, vui lòng kiểm tra lại');
    }
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw httpError(422,'File Excel chưa có dữ liệu câu hỏi');
  if (sheet.rowCount > MAX_ROWS + 1) throw httpError(422,`Mỗi lần import tối đa ${MAX_ROWS} dòng câu hỏi`);
  const headers = [];
  sheet.getRow(1).eachCell({includeEmpty:true},(cell,index)=>{const label=text(cell);headers[index-1]=COLUMN_KEYS[label] || label;});
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw httpError(422,'File Excel có cột trùng tên');
  const missing = COLUMNS.filter(column => !['option_c','option_d'].includes(column) && !headers.includes(column));
  if (missing.length) throw httpError(422,`File Excel thiếu cột: ${missing.map(key=>COLUMN_NAMES[key]).join(', ')}`);
  if (headers.some(column => column && ![...COLUMNS,'allow_shuffle_options'].includes(column))) throw httpError(422,'File Excel có cột không được hỗ trợ');
  const rows = []; const seen = new Set();
  for (let rowNumber=2; rowNumber<=sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (!row.hasValues) continue;
    const data = {}; const errors = [];
    try {
      for (let index=0; index<COLUMNS.length; index++) {
        const column=headers.indexOf(COLUMNS[index]);
        data[KEYS[index]]=column<0?'':text(row.getCell(column+1));
      }
      const shuffleColumn = headers.indexOf('allow_shuffle_options');
      const shuffleValue = shuffleColumn < 0 ? '' : row.getCell(shuffleColumn+1).value;
      if (shuffleValue === null || shuffleValue === undefined || shuffleValue === '') data.allowShuffleOptions=true;
      else if ([true,1,'true','1'].includes(shuffleValue)) data.allowShuffleOptions=true;
      else if ([false,0,'false','0'].includes(shuffleValue)) data.allowShuffleOptions=false;
      else throw httpError(422,'cho_phep_xao_tron chỉ nhận true/false hoặc 1/0');
      Object.assign(data,validateQuestion(data));
    } catch(error) {if (error.statusCode !== 422) throw error; errors.push(error.message);}
    if (data.questionCode) {
      // MySQL collation không phân biệt hoa/thường; database vẫn là nguồn kiểm tra cuối.
      const key=data.questionCode.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d');
      if (seen.has(key)) errors.push('Mã câu hỏi bị trùng trong file');
      seen.add(key);
    }
    rows.push({rowNumber,data,errors});
  }
  if (!rows.length) throw httpError(422,'File Excel chưa có dữ liệu câu hỏi');
  return rows;
};
const template = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Câu hỏi');
  sheet.columns = [...COLUMNS,'allow_shuffle_options'].map(key=>({header:COLUMN_NAMES[key],key,width:['content','option_a','option_b','option_c','option_d'].includes(key)?45:24}));
  sheet.getRow(1).font={bold:true}; sheet.views=[{state:'frozen',ySplit:1}];
  const help=workbook.addWorksheet('Hướng dẫn');
  for (const line of ['Nhập câu hỏi tại sheet Câu hỏi, mỗi dòng là một câu hỏi.','Giữ nguyên tên cột kỹ thuật ở dòng 1. Không nhập công thức hoặc liên kết.','ma_cau_hoi: mã duy nhất trong đợt; nhom_cau_hoi: tên nhóm; noi_dung: nội dung.','lua_chon_a, lua_chon_b bắt buộc; có thể bỏ cột lua_chon_c/lua_chon_d hoặc để trống khi không dùng. Có D thì phải có C.','dap_an_dung: A, B, C hoặc D, phải trỏ tới lựa chọn có nội dung.','cho_phep_xao_tron: tùy chọn, true/false hoặc 1/0; để trống mặc định true.','Đặt false cho câu có lựa chọn như A và B đúng hoặc Tất cả các đáp án trên.','Xem trước để rà soát lỗi; chỉ nhập sau khi bấm Xác nhận import.','Tối đa 500 dòng/lần và dung lượng 5 MB; chỉ hỗ trợ .xlsx.']) help.addRow([line]);
  help.getColumn(1).width=110;
  return workbook.xlsx.writeBuffer();
};
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sign = payload => {
  if (!process.env.CSRF_SECRET && !process.env.JWT_SECRET) throw httpError(500,'Chưa cấu hình khóa xác nhận import');
  return crypto.createHmac('sha256',process.env.CSRF_SECRET || process.env.JWT_SECRET).update(`questions-import:${payload}`).digest('base64url');
};
const previewToken = (buffer,userId,now=Date.now()) => {
  const payload=Buffer.from(JSON.stringify({digest:digest(buffer),userId,expiresAt:now+15*60*1000})).toString('base64url');
  return `${payload}.${sign(payload)}`;
};
const verifyPreview = (token,buffer,userId,now=Date.now()) => {
  if (typeof token !== 'string' || token.length>2048) throw httpError(422,'Vui lòng xem trước file trước khi xác nhận import');
  const [payload,signature,...extra]=token.split('.');
  const expected=sign(payload || '');
  const actual=Buffer.from(signature || ''); const wanted=Buffer.from(expected);
  if (extra.length || actual.length!==wanted.length || !crypto.timingSafeEqual(actual,wanted)) throw httpError(422,'Mã xác nhận import không hợp lệ');
  let data; try {data=JSON.parse(Buffer.from(payload,'base64url').toString());} catch {throw httpError(422,'Mã xác nhận import không hợp lệ');}
  if (data.userId!==userId || data.digest!==digest(buffer)) throw httpError(422,'File hoặc người xác nhận khác với lần xem trước');
  if (data.expiresAt<=now) throw httpError(409,'Phiên xem trước đã hết hạn, vui lòng xem trước lại');
};
module.exports={readWorkbook,template,previewToken,verifyPreview,MAX_ROWS};

// Xuất theo lô, cùng chín cột của mẫu; không đọc câu đã vô hiệu hóa.
const writeQuestions = async (roundId, stream) => {
 const db = require('../../config/database');
 return db.transaction(async trx => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({stream,useStyles:true});
  const sheet = workbook.addWorksheet('Câu hỏi');
  sheet.columns = [...COLUMNS,'allow_shuffle_options'].map(key=>({header:COLUMN_NAMES[key],key,width:['content','option_a','option_b','option_c','option_d'].includes(key)?45:24}));
  sheet.getRow(1).font={bold:true}; sheet.getRow(1).commit();
  let lastId; let count=0;
  while (true) {
   const query=trx('questions').where({exam_round_id:roundId}).whereNull('deleted_at').orderBy('id').limit(100);
   if(lastId) query.where('id','>',lastId);
   const rows=await query;
   if(!rows.length) break;
   for(const row of rows) sheet.addRow({...row,category:row.category_name,allow_shuffle_options:Boolean(row.allow_shuffle_options)}).commit();
   count+=rows.length;lastId=rows.at(-1).id;
  }
  sheet.commit();await workbook.commit();return {exportedCount:count};
 },{isolationLevel:'repeatable read'});
};
module.exports.writeQuestions=writeQuestions;
