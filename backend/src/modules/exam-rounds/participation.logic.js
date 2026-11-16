const {toDate}=require('../../utils/datetime');
const {modeFor}=require('../attempts/attempts.logic');
const {finalResult}=require('../attempts/results.logic');
const REASONS={NOT_STARTED:'Chưa đến thời gian bắt đầu',ENDED:'Đợt kiểm tra đã kết thúc',LIMIT_REACHED:'Đã sử dụng hết số lượt',PASSED:'Bạn đã đạt yêu cầu, đợt này không cho thi tiếp'};
const participation=(round,official={},trial={},active=null,now=Date.now())=>{
 const max=Number(round.max_attempts),used=Number(official.used||0);let isTrial=false,reasonCode=null;
 try{isTrial=modeFor(round,now);}catch{reasonCode=round.status!=='OPEN'||(round.end_at&&toDate(round.end_at).getTime()<=now)?'ENDED':'NOT_STARTED';}
 const current=isTrial?trial:official;
 if(!reasonCode&&round.stop_after_pass&&Number(current.passed)>0)reasonCode='PASSED';
 if(!reasonCode&&Number(current.used||0)>=max)reasonCode='LIMIT_REACHED';
 if(active)reasonCode=null;
 return {usedAttempts:used,maxAttempts:max,remainingAttempts:Math.max(0,max-used),activeAttempt:active,finalResult:finalResult(round,official,now),isTrial,
 trialUsedAttempts:Number(trial.used||0),trialRemainingAttempts:Math.max(0,max-Number(trial.used||0)),nextAttemptNumber:Number(current.last||0)+1,
 canStart:!active&&!reasonCode,canResume:Boolean(active),reasonCode,reason:REASONS[reasonCode]||null};
};
module.exports={participation,REASONS};
