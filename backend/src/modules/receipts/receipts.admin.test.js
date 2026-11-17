const test=require('node:test');const assert=require('node:assert/strict');
const {validateAdminQuery}=require('./receipts.validator');
const {requireAdmin}=require('../../middlewares/auth.middleware');
const {serialize}=require('./receipts.store');
test('Admin receipt filter accepts normalized codes, rejects invalid or extra fields',()=>{
 assert.deepEqual(validateAdminQuery({page:'1',limit:'20'}),{code:null});
 assert.deepEqual(validateAdminQuery({code:'ab3k7x'}),{code:'AB3K7X'});
 for(const query of [{code:'bad'},{userId:'other'}])assert.throws(()=>validateAdminQuery(query),{statusCode:422});
});
test('receipt admin guard denies USER and allows ADMIN',()=>{
 let status,next=false;const res={status:value=>{status=value;return res;},json:()=>res};
 requireAdmin({user:{role:'USER'},headers:{}},res,()=>{next=true;});assert.equal(status,403);assert.equal(next,false);
 requireAdmin({user:{role:'ADMIN'}},res,()=>{next=true;});assert.equal(next,true);
});
test('admin receipt serialization uses saved snapshot without changing it',()=>{
 const row={verification_code:'AB3K7X',data_snapshot:JSON.stringify({fullName:'TEST',correctCount:30,title:'Đợt cũ'})};
 const before=JSON.stringify(row);assert.deepEqual(serialize(row),{verificationCode:'AB3K7X',fullName:'TEST',correctCount:30,title:'Đợt cũ'});assert.equal(JSON.stringify(row),before);
});
