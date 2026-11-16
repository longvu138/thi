const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createSettingsStore,validate}=require('./settings.service');
test('Cấu hình hỗ trợ lưu bền, NFC, chỉ có nội dung được phép, không secret',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'E2E_settings_'));try{const store=createSettingsStore(path.join(dir,'settings.json'));assert.deepEqual(await store.get(),{supportContact:''});await store.save({supportContact:'  Ban tổ chức\n0900 000 000  '});assert.equal((await store.get()).supportContact,'Ban tổ chức\n0900 000 000');assert.equal((await fs.stat(path.join(dir,'settings.json'))).mode&0o777,0o600);
 for(const body of [null,[],{}, {supportContact:2},{supportContact:'x'.repeat(1001)},{supportContact:'ok',secret:'x'}])assert.throws(()=>validate(body),{statusCode:422});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
