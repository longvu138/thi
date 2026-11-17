import {publicRoundState} from './publicRounds.js';
// Tắt để dùng lại luồng chọn đợt/xác nhận bắt đầu hiện có.
export const DIRECT_SINGLE_ROUND_ENTRY = true;
export const singleEntryRound=(data,now=Date.now())=>{
 const items=data?.items||[];
 if((data?.pagination?.total||0)>items.length)return null;
 const open=items.filter(round=>now===null?round.status==='OPEN':publicRoundState(round,now).open);
 return open.length===1?open[0]:null;
};
export const enterSingleRound=async({list,get,start,returnPath,enabled=DIRECT_SINGLE_ROUND_ENTRY})=>{
 if(!enabled||returnPath?.startsWith('/attempts/'))return returnPath;
 const selectedId=returnPath?.match(/^\/exam-rounds\/([^/]+)$/)?.[1];
 const candidate=selectedId?{id:selectedId}:singleEntryRound(await list(),null);
 const round=candidate&&get?await get(candidate.id):candidate;
 if(!round)throw Object.assign(new Error('Không xác định được một đợt đang mở'),{entryReason:'Vui lòng chọn một đợt đang mở trước khi vào thi.'});
 const p=round.participation;
 if(p?.activeAttempt?.id)return `/attempts/${p.activeAttempt.id}`;
 if(!p?.canStart)throw Object.assign(new Error(p?.reason||'Hiện chưa thể bắt đầu đợt kiểm tra này'),{entryReason:p?.reason||'Hiện chưa thể bắt đầu đợt kiểm tra này'});
 const receipt=await start(round.id);
 return `/attempts/${receipt.attempt.id}`;
};
export const nextAction=(index,total)=>index===total-1?'submit':'next';
