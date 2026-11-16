const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {httpError}=require('../../utils/http-error');
const validate=body=>{
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>k!=='supportContact')||typeof body.supportContact!=='string'||body.supportContact.trim().length>1000)throw httpError(422,'Đầu mối hỗ trợ phải là văn bản tối đa 1000 ký tự');
 return {supportContact:body.supportContact.trim().normalize('NFC')};
};
const createSettingsStore=file=>({
 async get(){try{return validate(JSON.parse(await fs.readFile(file,'utf8')));}catch(error){if(error.code==='ENOENT')return {supportContact:''};throw error;}},
 async save(body){const value=validate(body);await fs.mkdir(path.dirname(file),{recursive:true});const temp=`${file}.${randomUUID()}.tmp`;
  try{await fs.writeFile(temp,JSON.stringify(value),{mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}return value;
 },
});
const store=createSettingsStore(path.resolve(process.env.APP_SETTINGS_FILE||'storage/settings.json'));
module.exports={...store,createSettingsStore,validate};
