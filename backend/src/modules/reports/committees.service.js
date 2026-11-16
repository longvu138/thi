const crypto=require('node:crypto');
const {normalizeParticipantText}=require('../../utils/participant-identity');
const {buildPagination}=require('../../utils/pagination');
const keyFor=value=>crypto.createHash('sha256').update(normalizeParticipantText(value).toLocaleLowerCase('vi')).digest('hex');
const prepareFilter=async(trx,roundId,filters)=>{
 if(!filters.committeeKey)return;
 await trx.raw('CREATE TEMPORARY TABLE tmp_committee_users (user_id CHAR(36) PRIMARY KEY) ENGINE=InnoDB');
 let cursor;
 while(true){const query=trx('attempts as a').join('users as u','u.id','a.user_id').where({'a.exam_round_id':roundId,'a.is_trial':Number(filters.isTrial)}).distinct('u.id','u.party_committee').orderBy('u.id').limit(100);if(cursor)query.where('u.id','>',cursor);const rows=await query;if(!rows.length)break;const matches=rows.filter(row=>keyFor(row.party_committee)===filters.committeeKey);if(matches.length&&!filters.committeeLabel)filters.committeeLabel=normalizeParticipantText(matches[0].party_committee)||'Chưa có đảng bộ';if(matches.length)await trx('tmp_committee_users').insert(matches.map(row=>({user_id:row.id})));cursor=rows.at(-1).id;}
 filters.committeeTable=true;
};
const cleanup=async trx=>{await trx.raw('DROP TEMPORARY TABLE IF EXISTS tmp_round_committees');await trx.raw('DROP TEMPORARY TABLE IF EXISTS tmp_committee_users');};
const page=async(trx,round,filters,now,pagination=filters.pagination)=>{
 if(!filters.committeesReady){
  await trx.raw('CREATE TEMPORARY TABLE tmp_round_committees (committee_key CHAR(64) PRIMARY KEY, name VARCHAR(255) NOT NULL, participant_count INT NOT NULL, passed_count INT NOT NULL, failed_count INT NOT NULL, incomplete_count INT NOT NULL, attempt_count INT NOT NULL) ENGINE=InnoDB');
  let batch=[];
  const flush=async()=>{if(!batch.length)return;await trx('tmp_round_committees').insert(batch).onConflict('committee_key').merge(Object.fromEntries(['participant_count','passed_count','failed_count','incomplete_count','attempt_count'].map(key=>[key,trx.raw('?? + VALUES(??)',[key,key])])));batch=[];};
  await require('./reports.service').eachPerson(trx,round,filters,now,async person=>{
   const key=keyFor(person.partyCommittee);let row=batch.find(row=>row.committee_key===key);
   if(!row){row={committee_key:key,name:normalizeParticipantText(person.partyCommittee)||'Chưa có đảng bộ',participant_count:0,passed_count:0,failed_count:0,incomplete_count:0,attempt_count:0};batch.push(row);}
   row.participant_count++;row.attempt_count+=person.usedAttempts;
   if(person.finalResult==='PASSED')row.passed_count++;else if(person.finalResult==='FAILED')row.failed_count++;else row.incomplete_count++;
   if(batch.length>=100)await flush();
  });await flush();filters.committeesReady=true;
 }
 const [{total}]=await trx('tmp_round_committees').count('* as total');
 const rows=await trx('tmp_round_committees').orderBy('name').orderBy('committee_key').limit(pagination.limit).offset(pagination.offset);
 return {items:rows.map(row=>({committeeKey:row.committee_key,partyCommittee:row.name,participantCount:Number(row.participant_count),passedCount:Number(row.passed_count),failedCount:Number(row.failed_count),incompleteCount:Number(row.incomplete_count),attemptCount:Number(row.attempt_count),passRate:Number((row.passed_count*100/row.participant_count).toFixed(4))})),pagination:buildPagination(pagination,total)};
};
module.exports={keyFor,prepareFilter,cleanup,page};
