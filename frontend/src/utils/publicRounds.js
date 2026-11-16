export const publicRoundState = (round, now = Date.now()) => {
 const start=round?.startAt ? Date.parse(round.startAt) : null;
 const trial=round?.trialStartAt ? Date.parse(round.trialStartAt) : null;
 const end=round?.endAt ? Date.parse(round.endAt) : null;
 const isTrial=Number.isFinite(start)&&start>now&&Number.isFinite(trial)&&trial<=now;
 const open=round?.status==='OPEN'&&(!Number.isFinite(end)||end>now)&&(!Number.isFinite(start)||start<=now||isTrial);
 const target=isTrial?start:end;
 const seconds=Number.isFinite(target)?Math.max(0,Math.ceil((target-now)/1000)):null;
 const days=seconds===null?0:Math.floor(seconds/86400);
 const clock=seconds===null?null:[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
 return {open,isTrial,label:isTrial?'Bắt đầu chính thức sau':'Thời gian còn lại',countdown:clock?`${days?`${days} ngày `:''}${clock}`:'Không giới hạn thời gian mở'};
};
