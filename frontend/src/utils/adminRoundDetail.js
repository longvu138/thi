export const unallocatedGroups=structure=>structure?.selectionConfig?.mode==='BY_GROUP'?(structure.groups||[]).filter(g=>g.isNew&&Number(g.count)===0):[];
export const prioritizeNewGroups=groups=>groups.map((g,index)=>({...g,_index:index})).sort((a,b)=>Number(Boolean(b.isNew&&Number(b.count)===0))-Number(Boolean(a.isNew&&Number(a.count)===0))||a._index-b._index);
export const roundOpenMissing=(round,structure,now=Date.now())=>{
 const missing=[];
 if(!round?.startAt||!Number.isFinite(Date.parse(round.startAt)))missing.push('Thiếu giờ bắt đầu');
 if(!round?.endAt||!Number.isFinite(Date.parse(round.endAt)))missing.push('Thiếu giờ kết thúc');
 else if(Date.parse(round.endAt)<=now)missing.push('Giờ kết thúc phải sau hiện tại');
 if(round?.startAt&&round?.endAt&&Date.parse(round.endAt)<=Date.parse(round.startAt))missing.push('Giờ kết thúc phải sau giờ bắt đầu');
 if(!structure)missing.push('Chưa tải được cơ cấu đề');
 else if(!round?.structureSufficient||!(round.questionCount>0))missing.push('Cơ cấu chưa đủ câu hợp lệ');
 return missing;
};
const remainingLabel=ms=>ms>=86400000?`${Math.ceil(ms/86400000)} ngày`:ms>=3600000?`${Math.ceil(ms/3600000)} giờ`:ms>=60000?`${Math.ceil(ms/60000)} phút`:'dưới 1 phút';
export const adminRoundCountdown=(round,now=Date.now())=>{
 const start=Date.parse(round?.startAt),end=Date.parse(round?.endAt),trial=Date.parse(round?.trialStartAt);
 if(round?.status==='CLOSED'||Number.isFinite(end)&&end<=now)return 'Đã kết thúc';
 if(start>now)return trial<=now&&round?.status==='OPEN'?`Đang chạy thử, chính thức sau ${remainingLabel(start-now)}`:`Còn ${remainingLabel(start-now)}`;
 if(round?.status==='OPEN')return Number.isFinite(end)?`Đang thi, kết thúc sau ${remainingLabel(end-now)}`:'Đang thi';
 return 'Chưa mở đợt';
};
