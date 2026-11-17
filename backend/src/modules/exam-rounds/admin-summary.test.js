const test=require('node:test');const assert=require('node:assert/strict');
const knex=require('knex');const {summaryQuery,loadSummaries,serializeSummary,missingItems}=require('./admin-summary');
test('summary counts official participants/pass rate without counting trial-only users',()=>{
 assert.deepEqual(serializeSummary({participant_count:'2',passed_count:'1',active_count:'1',submitted_count:'3',attempt_count:'4',total_attempts:'7'}),{participantCount:2,passedCount:1,inProgressCount:1,submittedCount:3,attemptCount:4,passRate:50,hasAttempts:true});
 assert.equal(serializeSummary({total_attempts:3}).participantCount,0);assert.equal(serializeSummary({total_attempts:3}).hasAttempts,true);assert.equal(serializeSummary().passRate,0);
});
test('batch summary performs one grouped query for many rounds, no query per row',async()=>{
 const db=knex({client:'mysql2'});let calls=0;db.client.runner=builder=>({run:async()=>{calls++;const sql=builder.toSQL();assert.match(sql.sql,/group by `exam_round_id`, `user_id`/);assert.match(sql.sql,/SUM\(is_trial = 0 AND status = 'IN_PROGRESS'\)/);assert.match(sql.sql,/SUM\(p.official > 0\)/);assert.match(sql.sql,/SUM\(p.submitted\)/);return [{exam_round_id:'a',participant_count:2,passed_count:1}];}});
 assert.equal((await loadSummaries(db,Array.from({length:100},(_,i)=>String(i)))).get('a').passRate,50);assert.equal(calls,1);
 await loadSummaries(db,[]);assert.equal(calls,1);await db.destroy();
});
test('missing items include time/questions/structure with correct target panel',()=>{
 const items=missingItems({});assert.equal(items.length,4);assert.equal(items.find(i=>i.label.includes('câu hỏi')).panel,'questions');assert.equal(items.find(i=>i.label.includes('cơ cấu')).panel,'structure');
 assert.deepEqual(missingItems({startAt:'2099-01-01',endAt:'2099-02-01',totalValidQuestionCount:30,structureSufficient:true}),[]);
});
test('summary SQL aggregates official submitted/expired together and all attempts only for deletion guard',()=>{
 const db=knex({client:'mysql2'});const sql=summaryQuery(db,['a','b']).toSQL();assert.deepEqual(sql.bindings,['a','b']);assert.match(sql.sql,/status IN \('SUBMITTED','EXPIRED'\)/);assert.match(sql.sql,/MAX\(is_trial = 0 AND result = 'PASS'\)/);db.destroy();
});
