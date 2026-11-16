const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const read=max=>JSON.parse(execFileSync(process.execPath,['-e',"const c=require('./knexfile');console.log(JSON.stringify({dev:c.development.pool.max,prod:c.production.pool.max}))"],{cwd:require('node:path').resolve(__dirname,'../..'),env:{...process.env,DB_POOL_MAX:max},encoding:'utf8'}));
test('Pool dev nhỏ, production 20, tăng được tới 50 và chặn sai giới hạn',()=>{
 assert.deepEqual(read(''),{dev:3,prod:20});assert.deepEqual(read('50'),{dev:50,prod:50});assert.equal(read('999').prod,50);assert.equal(read('0').dev,1);assert.equal(read('invalid').prod,20);
});
