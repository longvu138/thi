import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
export const ROUND_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const normalizeRound = data => {
 if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
 return { ...data };
};
export const normalizeRoundList = data => ({
 items: Array.isArray(data?.items) ? data.items.map(normalizeRound).filter(Boolean) : [],
 pagination: { page: 1, limit: 20, total: 0, ...(data?.pagination || {}) },
});
export const roundPickerTime = iso => iso && dayjs(iso).isValid() ? dayjs.utc(iso).tz(ROUND_TIMEZONE) : null;
// Lựa chọn trên lịch là giờ Việt Nam, kể cả khi trình duyệt ở múi giờ khác.
export const roundWallTime = value => value ? dayjs.tz(value, ROUND_TIMEZONE) : null;
export const roundTimePayload = value => value?.isValid?.() ? value.tz(ROUND_TIMEZONE, true).utc().toISOString() : null;
export const formatRoundTime = iso => {
 const value = roundPickerTime(iso);
 return value ? value.format('DD/MM/YYYY HH:mm') : 'Không giới hạn';
};
export const roundPayload = values => ({
 title: values.title?.trim(), description: values.description?.trim() || null,
 durationMinutes: values.durationMinutes, maxAttempts: values.maxAttempts,
 passingPercentage: values.passingPercentage,
 stopAfterPass: values.stopAfterPass, showCorrectAnswers: values.showCorrectAnswers,
 shuffleQuestions: values.shuffleQuestions, shuffleOptions: values.shuffleOptions,
 trialStartAt: roundTimePayload(values.trialStartAt), startAt: roundTimePayload(values.startAt), endAt: roundTimePayload(values.endAt),
});
export const roundWindowLabel = (round, now = Date.now()) => {
 if (round?.status === 'DRAFT') return 'Bản nháp';
 if (round?.status === 'CLOSED') return 'Đã đóng';
 if (round?.startAt && Date.parse(round.startAt) > now) return round.trialStartAt && Date.parse(round.trialStartAt) <= now ? 'Chạy thử' : 'Chưa đến thời gian mở';
 if (round?.endAt && Date.parse(round.endAt) <= now) return 'Đã hết thời gian';
 return 'Trong thời gian mở';
};

// Giữ lọc OPEN ở request để phân trang/tổng số khớp danh sách người dự thi.
export const roundListParams = (params = {}, admin = false) => admin ? params : Object.fromEntries(Object.entries(params).filter(([key])=>key!=='status'));
export const buildRoundJoinUrl = (origin, roundId) => {
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roundId || '')) return '';
 try {
  const base = new URL(origin);
  if (!['http:','https:'].includes(base.protocol) || base.username || base.password) return '';
  const url = new URL('/login',base.origin);
  url.searchParams.set('continue',`/exam-rounds/${roundId}`);
  return url.href;
 } catch { return ''; }
};
export const isLocalRoundJoinUrl = value => {
 try {return ['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(new URL(value).hostname);} catch {return false;}
};

export const startButtonState=round=>{
 const p=round?.participation;
 if(p?.activeAttempt?.id)return {label:'Tiếp tục làm bài',disabled:false,resume:true,reason:null};
 return {label:'Bắt đầu làm bài',disabled:!p?.canStart,resume:false,reason:p?.reason||(!p?'Đang tải trạng thái tham gia':null)};
};
export const roundPriority=(round,now=Date.now())=>round?.participation?.activeAttempt?0:['Trong thời gian mở','Chạy thử'].includes(roundWindowLabel(round,now))?1:roundWindowLabel(round,now)==='Chưa đến thời gian mở'?2:3;
export const sortParticipantRounds=(rows,now=Date.now())=>(Array.isArray(rows)?[...rows]:[]).sort((a,b)=>roundPriority(a,now)-roundPriority(b,now));
