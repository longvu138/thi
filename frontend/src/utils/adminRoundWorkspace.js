import {formatRoundTime} from './examRounds.js';
import {ROUND_SWITCHES} from '../constants/examRounds.js';
import {roundOpenMissing} from './adminRoundDetail.js';
export const ADMIN_ROUND_DESKTOP_QUERY='(min-width:1200px)';
export const adminSplitLayout=width=>width>=1200;
export const isReceiptCode=value=>/^(?:[A-Z0-9]{6}|(?:[0-9A-F]{4}-){4}[0-9A-F]{4})$/i.test(value.trim());
export const configSummary=round=>`${round.questionCount} câu · ${round.durationMinutes} phút · ${round.maxAttempts} lượt · Đạt từ ${round.passingPercentage}% · Chạy thử: ${round.trialStartAt?formatRoundTime(round.trialStartAt):'Không'} · Bắt đầu: ${formatRoundTime(round.startAt)} · Kết thúc: ${formatRoundTime(round.endAt)} (giờ Việt Nam) · ${ROUND_SWITCHES.filter(item=>round[item.key]).map(item=>item.label).join(' · ')||'Không bật tùy chọn bổ sung'}`;
export const structureSummary=structure=>structure?.selectionConfig?.mode==='BY_GROUP'?(structure.groups||[]).map(g=>`${g.category}: ${g.count} câu`).join(' · '):'Lấy ngẫu nhiên toàn bộ';
export const roundTodos=(round,structure,now=Date.now())=>roundOpenMissing(round,structure,now).map(label=>({label,panel:label.includes('cơ cấu')?'structure':'config'})).concat(!round?.totalValidQuestionCount?[{label:'Thêm hoặc import câu hỏi',panel:'questions'}]:[]);
export const legacyAdminTarget=({id,kind,search=''})=>{
 const params=new URLSearchParams(search);params.delete('action');
 if(kind==='receipts')return '/admin/exam-rounds';
 if(kind==='receipt'){params.set('receiptAttempt',id);return `/admin/exam-rounds?${params}`;}
 if(kind==='reports')params.set('panel','results');
 const tab=params.get('tab');params.delete('tab');
 if(tab&&kind!=='reports'){
  const panel={overview:'config',questions:'questions',structure:'structure'}[tab];
  if(panel)params.set('panel',panel);else params.delete('panel');
 }
 return `/admin/exam-rounds${id?`/${id}`:''}${params.size?`?${params}`:''}`;
};
