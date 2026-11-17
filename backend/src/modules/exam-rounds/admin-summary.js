const summaryQuery=(client,ids)=>{
 const people=client('attempts').whereIn('exam_round_id',ids).groupBy('exam_round_id','user_id').select('exam_round_id','user_id').count('* as all_attempts')
  .select(client.raw("SUM(is_trial = 0) AS official"),client.raw("SUM(is_trial = 0 AND status = 'IN_PROGRESS') AS active"),client.raw("SUM(is_trial = 0 AND status IN ('SUBMITTED','EXPIRED')) AS submitted"),client.raw("MAX(is_trial = 0 AND result = 'PASS') AS passed"));
 return client.select('p.exam_round_id').from(people.as('p')).groupBy('p.exam_round_id')
  .select(client.raw('SUM(p.all_attempts) AS total_attempts'),client.raw('SUM(p.official) AS attempt_count'),client.raw('SUM(p.official > 0) AS participant_count'),client.raw('SUM(p.active) AS active_count'),client.raw('SUM(p.submitted) AS submitted_count'),client.raw('SUM(p.passed) AS passed_count'));
};
const serializeSummary=row=>{
 const participants=Number(row?.participant_count||0),passed=Number(row?.passed_count||0);
 return {inProgressCount:Number(row?.active_count||0),submittedCount:Number(row?.submitted_count||0),participantCount:participants,passedCount:passed,passRate:participants?Number((100*passed/participants).toFixed(4)):0,attemptCount:Number(row?.attempt_count||0),hasAttempts:Number(row?.total_attempts||0)>0};
};
const loadSummaries=async(client,ids)=>{if(!ids.length)return new Map();const rows=await summaryQuery(client,ids);return new Map(rows.map(row=>[row.exam_round_id,serializeSummary(row)]));};
const missingItems=(round,now=Date.now())=>{
 const missing=[];
 if(!round.startAt)missing.push({label:'Chưa đặt giờ bắt đầu',panel:'config'});
 if(!round.endAt)missing.push({label:'Chưa đặt giờ kết thúc',panel:'config'});
 else if(Date.parse(round.endAt)<=now)missing.push({label:'Giờ kết thúc đã qua',panel:'config'});
 if(!round.totalValidQuestionCount)missing.push({label:'Chưa có câu hỏi hợp lệ',panel:'questions'});
 if(!round.structureSufficient)missing.push({label:'Thiếu cơ cấu đề',panel:'structure'});
 return missing;
};
module.exports={summaryQuery,serializeSummary,loadSummaries,missingItems};
