export const normalizeAttempt = raw => {
 const questions = Array.isArray(raw?.questions) ? raw.questions.filter(q => q && typeof q.id === 'string').map(q => ({
  id:q.id, position:Number(q.position)||1, categoryName:q.categoryName || 'Nhóm câu hỏi', questionCode:q.questionCode || '', content:q.content || '',
  options:Array.isArray(q.options)?q.options.filter(option=>option && ['A','B','C','D'].includes(option.key)).map(option=>({key:option.key,content:option.content || ''})):[],
  answerUpdatedAt:q.answerUpdatedAt||null,selectedAnswer:['A','B','C','D'].includes(q.selectedAnswer)?q.selectedAnswer:null,
 })):[];
 return {id:raw?.id || '',examRoundId:raw?.examRoundId || '',title:raw?.title || 'Lượt kiểm tra',status:raw?.status || '',isTrial:Boolean(raw?.isTrial),attemptNumber:Number(raw?.attemptNumber)||1,
  startedAt:raw?.startedAt,expiresAt:raw?.expiresAt,serverTime:raw?.serverTime,questions,config:{questionCount:questions.length,...(raw?.config || {})}};
};
export const attemptReceipt = (raw, started, received) => {
 const attempt=normalizeAttempt(raw);const remaining=Math.max(0,Date.parse(attempt.expiresAt)-Date.parse(attempt.serverTime)-(received-started)/2);
 return {attempt,deadline:received+(Number.isFinite(remaining)?remaining:0)};
};
export const remainingSeconds = (deadline,now) => Math.max(0,Math.ceil((deadline-now)/1000));
export const formatAttemptClock = seconds => {
 const value=Math.max(0,Math.floor(seconds));const hours=Math.floor(value/3600);const minutes=Math.floor(value%3600/60);const rest=value%60;
 return [ ...(hours?[String(hours).padStart(2,'0')]:[]),String(minutes).padStart(2,'0'),String(rest).padStart(2,'0')].join(':');
};
export const groupAttemptQuestions = questions => {
 const groups=new Map();
 for(const [index,q] of (Array.isArray(questions)?questions:[]).entries()){
  const name=q.categoryName || 'Nhóm câu hỏi';if(!groups.has(name))groups.set(name,[]);groups.get(name).push({id:q.id,index,position:q.position});
 }
 return [...groups].map(([name,items])=>({name,items}));
};
export const isNetworkFailure = error => !error?.response || [408,429,502,503,504].includes(error.response.status);
export const attemptWarnings = (previous,current,seen) => {
 if(current<=0)return [];
 if(previous===null){const threshold=current<=300?300:current<=600?600:null;return threshold && !seen.has(threshold)?[threshold]:[];}
 return [600,300].filter(threshold=>previous>threshold && current<=threshold && !seen.has(threshold));
};
export const attemptShortcut = (event,{dialog=false,enabled=true}={}) => {
 if(!enabled || dialog || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing)return null;
 const target=event.target;
 if(target?.isContentEditable || target?.closest?.('input:not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]),textarea,select,[role="textbox"],[role="combobox"],[contenteditable="true"]'))return null;
 if(event.key==='ArrowLeft')return {move:-1};if(event.key==='ArrowRight')return {move:1};
 if(['a','b','c','d'].includes(event.key.toLowerCase()))return {answer:event.key.toUpperCase()};return null;
};

export const canAutoSave = (state, online, now = Date.now()) => Boolean(online && state?.pendingCount && !state.submitting && (!state.error || (isNetworkFailure(state.error) && now >= (state.retryAt || 0))));

export const syncDeadline=(current,incoming)=>current&&Math.abs(current-incoming)<=2000?current:incoming;
export const nextQuestionIndex=(index,total,enabled,answer)=>enabled&&answer!==null?Math.min(total-1,index+1):index;
export const resultDestination=id=>`/attempts/${id}/result`;
export const BATCH_INTERVAL_MS=30000;
