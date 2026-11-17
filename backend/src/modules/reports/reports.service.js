const db = require('../../config/database');
const { finalResult, finalResultSql } = require('../attempts/results.logic');
const { buildPagination } = require('../../utils/pagination');
const { containsPattern } = require('../../utils/sql-like');
const { toIsoUtc } = require('../../utils/datetime');
const { httpError } = require('../../utils/http-error');
const { validate } = require('./reports.validator');

const participantQuery = (trx, roundId, filters) => {
 const query = trx('attempts as a').join('users as u','u.id','a.user_id').where('a.exam_round_id',roundId).where('a.is_trial',Number(filters.isTrial));
 if(filters.committeeTable)query.whereIn('u.id',trx('tmp_committee_users').select('user_id'));
 for (const [key,column] of [['partyCommittee','party_committee'],['partyBranch','party_branch']]) if(filters[key]) query.where(`u.${column}`,'like',containsPattern(filters[key]));
 if(filters.search)query.where(function(){this.where('u.full_name','like',containsPattern(filters.search)).orWhere('u.party_committee','like',containsPattern(filters.search)).orWhere('u.party_branch','like',containsPattern(filters.search));});
 return query.groupBy('u.id','u.full_name','u.party_committee','u.party_branch')
  .select('u.id','u.full_name','u.party_committee','u.party_branch').count('* as used')
  .select(trx.raw("COALESCE(SUM(a.result = 'PASS'),0) as passed"),trx.raw("COALESCE(SUM(a.status = 'IN_PROGRESS'),0) as active"))
  .max('a.submitted_at as latest_submitted_at').max('a.percentage as best_percentage').max('a.started_at as latest_at');
};
const person = (row,round,now) => ({userId:row.id,fullName:row.full_name,partyCommittee:row.party_committee||'',partyBranch:row.party_branch||'',examRoundId:round.id,title:round.title,
 usedAttempts:Number(row.used),maxAttempts:Number(round.max_attempts),bestPercentage:row.best_percentage===null?null:Number(row.best_percentage),
 finalResult:finalResult(round,row,now),latestAt:toIsoUtc(row.latest_at),latestSubmittedAt:toIsoUtc(row.latest_submitted_at)});
const eachPerson = async (trx,round,filters,now,visit) => {
 let cursor;
 while(true){
  const query=participantQuery(trx,round.id,filters).orderBy('u.id').limit(100);if(cursor)query.where('u.id','>',cursor);
  const rows=await query;if(!rows.length)break;
  for(const row of rows){const item=person(row,round,now);if(!filters.result||item.finalResult===filters.result)await visit(item);}
  cursor=rows.at(-1).id;
 }
};
const statistics = async (trx,round,filters,now,visit) => {
 const stats={participantCount:0,passedCount:0,failedCount:0,incompleteCount:0,passRate:0,attemptCount:0,averageAttempts:0};
 await eachPerson(trx,round,filters,now,async row=>{
  stats.participantCount++;stats.attemptCount+=row.usedAttempts;
  if(row.finalResult==='PASSED')stats.passedCount++;else if(row.finalResult==='FAILED')stats.failedCount++;else stats.incompleteCount++;
  if(visit)await visit(row,stats.participantCount-1);
 });
 stats.passRate=stats.participantCount?Number((stats.passedCount*100/stats.participantCount).toFixed(4)):0;
 stats.averageAttempts=stats.participantCount?Number((stats.attemptCount/stats.participantCount).toFixed(4)):0;
 return stats;
};
// Subquery of people after all filters, including final result, shared with question counts.
const eligibleUsers = async (trx,round,filters,now) => {
 // Persist only IDs server-side in a SQL subquery, without building a large JS list.
 const grouped=participantQuery(trx,round.id,filters);
 const state=finalResultSql(trx,round,now);
 const query=trx.select('p.id').from(grouped.as('p'));
 if(filters.result)query.where(state,filters.result);
 return {query}; // Do not await a Knex builder accidentally.
};
const questionPage = async (trx,round,filters,now,pagination=filters.pagination) => {
 const {query:users}=await eligibleUsers(trx,round,filters,now);
 const base=trx('attempt_questions as q').join('attempts as a','a.id','q.attempt_id').leftJoin('attempt_answers as ans',function(){this.on('ans.attempt_id','=','a.id').andOn('ans.attempt_question_id','=','q.id');})
  .where('a.exam_round_id',round.id).where('a.is_trial',Number(filters.isTrial)).whereIn('a.status',['SUBMITTED','EXPIRED']).whereIn('a.user_id',users);
 const grouped=base.groupBy('q.question_id').select('q.question_id').count('* as encounterCount').max('q.id as snapshotId')
  .select(trx.raw('SUM(ans.selected_answer = q.correct_answer) as correctCount'),trx.raw('SUM(ans.selected_answer IS NULL) as unansweredCount'),trx.raw('100.0 * COALESCE(SUM(ans.selected_answer = q.correct_answer),0) / COUNT(*) as correctRate'));
 for(const key of ['A','B','C','D'])grouped.select(trx.raw("COALESCE(SUM(JSON_UNQUOTE(JSON_EXTRACT(q.options_snapshot, REPLACE(JSON_UNQUOTE(JSON_SEARCH(q.options_snapshot, 'one', ans.selected_answer, NULL, '$[*].key')), '.key', '.originalKey'))) = ?),0) as ??",[key,`option${key}Count`]));
 const [{total}]=await trx.count('* as total').from(grouped.clone().as('counted'));
 const rows=await grouped.orderBy(filters.sort,filters.order).orderBy('q.question_id').limit(pagination.limit).offset(pagination.offset);
 const snapshots=rows.length?await trx('attempt_questions').whereIn('id',rows.map(row=>row.snapshotId)).select('id','question_code','category_name','content'):[];
 const map=new Map(snapshots.map(row=>[row.id,row]));
 return {items:rows.map(row=>({questionId:row.question_id,questionCode:map.get(row.snapshotId)?.question_code,categoryName:map.get(row.snapshotId)?.category_name,content:map.get(row.snapshotId)?.content,
  ...Object.fromEntries(['encounterCount','correctCount','unansweredCount','correctRate','optionACount','optionBCount','optionCCount','optionDCount'].map(key=>[key,Number(Number(row[key]||0).toFixed(4))]))})),pagination:buildPagination(pagination,total)};
};
const read = async (id,query,work) => {
 const filters=validate(id,query);const now=Date.now();
 // Dùng đúng chốt lười/khóa/chấm hiện có, không chấm lại lượt đã chốt.
 let cursor;
 while(true){
  const overdue=db('attempts').where({exam_round_id:id,is_trial:Number(filters.isTrial),status:'IN_PROGRESS'}).where('expires_at','<=',new Date(now)).orderBy('id').limit(100).select('id');
  if(cursor)overdue.where('id','>',cursor);
  const rows=await overdue;if(!rows.length)break;
  for(const row of rows)await require('../attempts/attempts.service').expireOne(row.id,{now:()=>now});
  cursor=rows.at(-1).id;
 }
 return db.transaction(async trx=>{
  const round=await trx('exam_rounds').where({id}).first();if(!round)throw httpError(404,'Không tìm thấy đợt kiểm tra');
  const committees=require('./committees.service');
  await committees.cleanup(trx);
  try{await committees.prepareFilter(trx,id,filters);return await work({trx,round,filters,now});}finally{await committees.cleanup(trx);}
 },{isolationLevel:'repeatable read'});
};
const sortedPeopleQuery=(trx,round,filters,now)=>{
 const grouped=participantQuery(trx,round.id,filters);
 const query=trx.select('p.*').from(grouped.as('p'));
 if(filters.result)query.where(finalResultSql(trx,round,now),filters.result);
 return query.orderBy('p.latest_submitted_at',filters.order).orderBy('p.id','asc').limit(filters.pagination.limit).offset(filters.pagination.offset);
};
const results = (id,query) => read(id,query,async ({trx,round,filters,now})=>{
 let items=[];
 const latest=filters.sort==='latestAt';
 const stats=await statistics(trx,round,filters,now,(row,index)=>{if(!latest&&index>=filters.pagination.offset&&items.length<filters.pagination.limit)items.push(row);});
 if(latest)items=(await sortedPeopleQuery(trx,round,filters,now)).map(row=>({...person(row,round,now),latestAt:toIsoUtc(row.latest_submitted_at)}));
 return {round:{id:round.id,title:round.title},isTrial:filters.isTrial,statistics:stats,items,pagination:buildPagination(filters.pagination,stats.participantCount)};
});
const stats = (id,query) => read(id,query,async ({trx,round,filters,now})=>({isTrial:filters.isTrial,...await statistics(trx,round,filters,now)}));
const questions = (id,query) => read(id,query,async ({trx,round,filters,now})=>({isTrial:filters.isTrial,...await questionPage(trx,round,filters,now)}));
const committees=(id,query)=>read(id,query,({trx,round,filters,now})=>require('./committees.service').page(trx,round,filters,now));
module.exports={sortedPeopleQuery,committees,read,results,stats,questions,statistics,eachPerson,questionPage};
