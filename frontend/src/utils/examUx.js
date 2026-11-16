// Chỉ trình bày; quyền và cấu hình hợp lệ vẫn do Backend quyết định.
export const attemptProgressLabel=(index,total,answered)=>`${Math.min(index+1,total)}/${total} · đã làm ${answered}`;
export const submitConfirmation=(unanswered,total)=>unanswered?`Bạn còn ${unanswered} câu chưa trả lời. Câu bỏ trống được tính là sai.`:`Bạn đã trả lời đủ ${total} câu`;
export const filterResultQuestions=(questions,filter,reveal)=>questions.filter(q=>filter==='empty'?!q.selectedAnswer:filter==='wrong'?Boolean(reveal&&q.selectedAnswer&&q.correctAnswer&&q.selectedAnswer!==q.correctAnswer):true);
export const canTakeNextAttempt=(round,now=Date.now())=>{
 const p=round?.participation;
 return Boolean(round?.status==='OPEN'&&p?.canStart&&!p.activeAttempt&&(p.isTrial?p.trialRemainingAttempts:p.remainingAttempts)>0&&(!round.endAt||Date.parse(round.endAt)>now));
};
export const bestPercentage=(rows,isTrial=false)=>{
 const scores=rows.filter(r=>Boolean(r.isTrial)===isTrial&&['SUBMITTED','EXPIRED'].includes(r.status)&&r.percentage!==null&&r.percentage!==undefined).map(r=>Number(r.percentage)).filter(Number.isFinite);
 return scores.length?Math.max(...scores):null;
};
export const roundReadiness=round=>[
 {key:'questions',label:'Có câu hỏi hợp lệ',ready:Number(round?.validQuestionCount)>0,tab:'questions'},
 {key:'structure',label:'Cơ cấu đủ câu',ready:Number(round?.questionCount)>0&&round?.structureSufficient===true,tab:'structure'},
 {key:'start',label:'Đã đặt thời gian bắt đầu',ready:Boolean(round?.startAt),tab:'overview'},
 {key:'end',label:'Đã đặt thời gian kết thúc',ready:Boolean(round?.endAt),tab:'overview'},
 {key:'status',label:`Trạng thái: ${round?.status==='OPEN'?'Đang mở':round?.status==='CLOSED'?'Đã đóng':'Bản nháp'}`,ready:round?.status==='OPEN',tab:'overview'},
];
