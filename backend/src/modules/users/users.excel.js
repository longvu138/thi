const ExcelJS=require('exceljs');
const crypto=require('node:crypto');
const {httpError}=require('../../utils/http-error');
const {validateUser}=require('./users.validator');
const COLUMN_NAMES={username:'ten_dang_nhap',full_name:'ho_ten',password:'mat_khau',role:'vai_tro',is_active:'hoat_dong'};
const COLUMNS=Object.keys(COLUMN_NAMES);
const COLUMN_KEYS=Object.fromEntries(Object.entries(COLUMN_NAMES).map(([key,label])=>[label,key]));
const cellText=cell=>{
 if(cell.value==null)return '';
 if(typeof cell.value==='string')return cell.value;
 // Giữ mật khẩu/tên tài khoản là văn bản để không mất số 0 đầu.
 throw httpError(422,'Vui lòng định dạng ô dạng Văn bản, không dùng số hoặc công thức');
};
const readUsers=async buffer=>{
 const {fileTypeFromBuffer}=await import('file-type');let type;
 try{type=await fileTypeFromBuffer(buffer);}catch{throw httpError(422,'Không đọc được định dạng file Excel');}
 if(type?.ext!=='xlsx')throw httpError(422,'Vui lòng chọn file Excel .xlsx hợp lệ');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(buffer);}catch{throw httpError(422,'Không đọc được file Excel');}
 const sheet=book.worksheets[0];if(!sheet || sheet.rowCount<2)throw httpError(422,'File chưa có dữ liệu tài khoản');
 if(sheet.rowCount>101)throw httpError(422,'Mỗi lần import tối đa 100 tài khoản');
 const headers=[];sheet.getRow(1).eachCell({includeEmpty:true},(cell,index)=>{const label=cellText(cell).trim();headers[index-1]=COLUMN_KEYS[label] || label;});
 if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw httpError(422,'File có cột trùng tên');
 const missing=COLUMNS.slice(0,3).filter(key=>!headers.includes(key));if(missing.length)throw httpError(422,`File thiếu cột: ${missing.map(key=>COLUMN_NAMES[key]).join(', ')}`);
 if(headers.some(key=>key && !COLUMNS.includes(key)))throw httpError(422,'File có cột không được hỗ trợ');
 const rows=[];const seen=new Set();
 for(let rowNumber=2;rowNumber<=sheet.rowCount;rowNumber++){
  const row=sheet.getRow(rowNumber);if(!row.hasValues)continue;
  let data={};const errors=[];
  try{
   const value=key=>headers.includes(key)?cellText(row.getCell(headers.indexOf(key)+1)):'';
   data.username=value('username').trim();data.fullName=value('full_name').trim();
   const role=value('role').trim() || 'USER';
   const activeCell=headers.includes('is_active')?row.getCell(headers.indexOf('is_active')+1).value:null;
   let isActive=true;
   if([false,0,'false','0'].includes(activeCell))isActive=false;
   else if(![null,undefined,'',true,1,'true','1'].includes(activeCell))throw httpError(422,'hoat_dong chỉ nhận true/false hoặc 1/0');
   data=validateUser({username:data.username,fullName:data.fullName,password:value('password'),role,isActive},true);
  }catch(error){if(error.statusCode!==422)throw error;errors.push(error.message);}
  const key=data.username?.toLowerCase();if(key){if(seen.has(key))errors.push('Tài khoản trùng trong file');seen.add(key);}
  rows.push({rowNumber,data,errors});
 }
 if(!rows.length)throw httpError(422,'File chưa có dữ liệu tài khoản');return rows;
};
const template=async()=>{
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Tài khoản');sheet.columns=COLUMNS.map(key=>({header:COLUMN_NAMES[key],key,width:28,style:{numFmt:'@'}}));sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];
 const help=book.addWorksheet('Hướng dẫn');help.getColumn(1).width=110;
 for(const line of ['Điền sheet Tài khoản; giữ tên cột ở dòng 1.','ten_dang_nhap: bắt buộc, 3–64 ký tự chữ/số/dấu chấm/gạch dưới/gạch ngang.','ho_ten: họ tên bắt buộc. mat_khau: mật khẩu bắt buộc, tối thiểu 6 ký tự.','Định dạng ten_dang_nhap/mat_khau là Văn bản để giữ nguyên số 0 ở đầu. Không dùng công thức.','vai_tro: USER hoặc ADMIN, để trống mặc định USER. hoat_dong: true/false hoặc 1/0, mặc định true.','Chỉ tạo tài khoản mới, không cập nhật hoặc ghi đè tài khoản đã có hoặc đã xóa.','Tối đa 100 tài khoản và 5 MB mỗi lần. Xem trước rồi xác nhận để nhập toàn bộ.','Mật khẩu không hiển thị trong kết quả xem trước; bảo quản file Excel có mật khẩu.'])help.addRow([line]);
 return book.xlsx.writeBuffer();
};
const sign=payload=>{
 const secret=process.env.CSRF_SECRET || process.env.JWT_SECRET;if(!secret)throw httpError(500,'Chưa cấu hình khóa xác nhận import');
 return crypto.createHmac('sha256',secret).update(`users-import:${payload}`).digest('base64url');
};
const fileHash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const tokenFor=(buffer,userId,now=Date.now())=>{const payload=Buffer.from(JSON.stringify({fileHash:fileHash(buffer),userId,expiresAt:now+900000})).toString('base64url');return `${payload}.${sign(payload)}`;};
const verifyToken=(token,buffer,userId)=>{
 if(typeof token!=='string' || token.length>2048)throw httpError(422,'Vui lòng xem trước file trước khi xác nhận');
 const [payload,signature,...rest]=token.split('.');const expected=Buffer.from(sign(payload || ''));const actual=Buffer.from(signature || '');
 if(rest.length || expected.length!==actual.length || !crypto.timingSafeEqual(expected,actual))throw httpError(422,'Mã xác nhận import không hợp lệ');
 let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{throw httpError(422,'Mã xác nhận import không hợp lệ');}
 if(data.userId!==userId || data.fileHash!==fileHash(buffer))throw httpError(422,'File hoặc người xác nhận khác với lần xem trước');
 if(data.expiresAt<=Date.now())throw httpError(409,'Phiên xem trước đã hết hạn, vui lòng xem trước lại');
};
module.exports={readUsers,template,tokenFor,verifyToken};
