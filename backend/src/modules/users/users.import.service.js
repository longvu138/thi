const db=require('../../config/database');
const {readUsers,tokenFor,verifyToken}=require('./users.excel');
const {hashPassword}=require('../../utils/password-hash');
const {httpError}=require('../../utils/http-error');
const {createUuid}=require('../../utils/uuid');
const checkExisting=async(rows,client)=>{
 const names=rows.map(row=>row.data.username).filter(Boolean);if(!names.length)return;
 const used=await client('users').whereIn('username',names).select('username');const keys=new Set(used.map(user=>user.username.toLowerCase()));
 for(const row of rows)if(keys.has(row.data.username?.toLowerCase()))row.errors.push('Tên tài khoản đã được sử dụng');
};
const importUsers=async({mode,buffer,token,userId})=>{
 if(!['preview','commit'].includes(mode))throw httpError(422,'Chế độ import phải là preview hoặc commit');
 if(!buffer?.length)throw httpError(422,'Vui lòng chọn file Excel');
 if(mode==='commit')verifyToken(token,buffer,userId);
 const rows=await readUsers(buffer);
 if(mode==='preview'){
  await checkExisting(rows,db);const validCount=rows.filter(row=>!row.errors.length).length;
  return {total:rows.length,validCount,errorCount:rows.length-validCount,previewToken:validCount===rows.length?tokenFor(buffer,userId):null,rows:rows.map(row=>({rowNumber:row.rowNumber,errors:row.errors,data:{username:row.data.username,fullName:row.data.full_name || row.data.fullName || '',role:row.data.role || 'USER',isActive:row.data.is_active!==0}}))};
 }
 if(rows.some(row=>row.errors.length))throw httpError(422,'File có lỗi dữ liệu, vui lòng sửa và xem trước lại');
 // Băm tuần tự trước transaction để giới hạn RAM và không giữ kết nối pool.
 const prepared=[];for(const row of rows){const {password,...data}=row.data;prepared.push({id:createUuid(),...data,password_hash:await hashPassword(password)});}
 try{return await db.transaction(async trx=>{
  await checkExisting(rows,trx);if(rows.some(row=>row.errors.length))throw httpError(409,'Tài khoản đã phát sinh sau khi xem trước, vui lòng xem trước lại');
  for(const user of prepared.sort((a,b)=>a.username.localeCompare(b.username)))await trx('users').insert(user);
  return {importedCount:prepared.length,userIds:prepared.map(user=>user.id)};
 });}catch(error){
  if(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code))throw httpError(409,'Dữ liệu tài khoản đã thay đổi, vui lòng xem trước lại');throw error;
 }
};
module.exports={importUsers};
