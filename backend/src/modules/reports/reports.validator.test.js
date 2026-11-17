const test=require('node:test');const assert=require('node:assert/strict');const {validate}=require('./reports.validator');
const id='11111111-1111-4111-8111-111111111111';
test('Báo cáo mặc định chính thức, giới hạn phân trang và kiểm tra bộ lọc',()=>{
 const value=validate(id,{limit:'999',partyCommittee:' Đảng bộ ',result:'PASSED'});
 assert.equal(value.isTrial,false);assert.equal(value.pagination.limit,100);assert.equal(value.partyCommittee,'Đảng bộ');
 assert.equal(validate(id,{isTrial:'true'}).isTrial,true);
 for(const query of [{isTrial:'1'},{sort:'DROP'},{order:'x'},{result:'PASS'},{userId:id},{partyBranch:[]}])assert.throws(()=>validate(id,query),{statusCode:422});
 assert.throws(()=>validate('bad',{}),{statusCode:422});
});
test('latestAt ordering is validated and translated to one ordered SQL page',()=>{
 const knex=require('knex')({client:'mysql2'});const {sortedPeopleQuery}=require('./reports.service');
 const filters=validate(id,{sort:'latestAt',order:'desc',page:'2',limit:'10'});
 assert.equal(filters.sort,'latestAt');const sql=sortedPeopleQuery(knex,{id,max_attempts:3},filters,Date.now()).toSQL();
 assert.match(sql.sql,/order by `p`.`latest_submitted_at` desc, `p`.`id` asc limit \? offset \?/);
 assert.ok(sql.bindings.includes(0));assert.deepEqual(sql.bindings.slice(-2),[10,10]);knex.destroy();
});
