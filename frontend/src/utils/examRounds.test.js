import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoundList, normalizeRound, roundPickerTime, roundWallTime, roundTimePayload, roundPayload, formatRoundTime, roundWindowLabel } from './examRounds.js';
import { canAccessNavItem, getRouteTitle } from '../app/navigation.js';
test('Đợt kiểm tra có fallback an toàn khi API trả null', () => {
 assert.equal(normalizeRound(null), null); assert.deepEqual(normalizeRoundList(null).items, []);
 assert.deepEqual(normalizeRound({id:'1'}),{id:'1'});
});
test('Giờ Việt Nam hiển thị và chuyển về UTC độc lập múi giờ trình duyệt', () => {
 const iso = '2026-11-10T01:30:00Z';
 assert.equal(formatRoundTime(iso), '10/11/2026 08:30');
 assert.equal(roundTimePayload(roundPickerTime(iso)), '2026-11-10T01:30:00.000Z');
 assert.equal(roundTimePayload(roundWallTime('2026-11-10T08:30')), '2026-11-10T01:30:00.000Z');
 assert.equal(roundTimePayload(null), null); assert.equal(formatRoundTime(null), 'Không giới hạn');
});
test('Payload giữ tùy chọn false và xóa giới hạn thời gian khi để trống', () => {
 const result = roundPayload({ title: ' Đợt test ', questionCount:50, categoryIds: null, stopAfterPass: false, shuffleOptions: false });
 assert.equal(result.title, 'Đợt test'); assert.equal(result.stopAfterPass, false); assert.equal(result.shuffleOptions, false); assert.equal(result.endAt, null); assert.equal(Object.hasOwn(result,'categoryIds'),false);assert.equal(Object.hasOwn(result,'questionCount'),false);
});
test('Nhãn thời gian phản ánh đợt đóng, chưa mở và hết hạn', () => {
 const now = Date.parse('2026-11-10T01:00:00Z');
 assert.equal(roundWindowLabel({ status: 'CLOSED' }, now), 'Đã đóng');
 assert.equal(roundWindowLabel({ status: 'OPEN', startAt: '2026-11-10T02:00:00Z' }, now), 'Chưa đến thời gian mở');
 assert.equal(roundWindowLabel({ status: 'OPEN', endAt: '2026-11-10T01:00:00Z' }, now), 'Đã hết thời gian');
});
test('Menu đợt kiểm tra đúng vai trò và tiêu đề trang chi tiết', () => {
 assert.equal(canAccessNavItem({ role: 'USER' }, 'admin-rounds'), false); assert.equal(canAccessNavItem({ role: 'ADMIN' }, 'admin-rounds'), true);
 assert.equal(canAccessNavItem({ role: 'USER' }, 'exam-rounds'), true); assert.equal(getRouteTitle('/exam-rounds/example'), 'Đợt kiểm tra');
});

test('Chạy thử hiển thị đúng nhãn và chuyển thời gian về UTC',()=>{
 const now=Date.parse('2026-11-11T01:30:00Z');
 assert.equal(roundWindowLabel({status:'OPEN',trialStartAt:'2026-11-11T01:00:00Z',startAt:'2026-11-11T02:00:00Z'},now),'Chạy thử');
 assert.equal(roundPayload({trialStartAt:roundWallTime('2026-11-11T08:00')}).trialStartAt,'2026-11-11T01:00:00.000Z');
});

import {roundListParams,buildRoundJoinUrl,isLocalRoundJoinUrl} from './examRounds.js';
test('Danh sách người dự thi có cả đợt đã kết thúc, quản trị giữ bộ lọc riêng',()=>{
 assert.deepEqual(roundListParams({page:2,limit:20,status:'CLOSED'}),{page:2,limit:20});
 assert.deepEqual(roundListParams({status:'CLOSED'},true),{status:'CLOSED'});
});
test('QR giữ đúng đợt và không mang phiên hoặc query máy gốc',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const value=new URL(buildRoundJoinUrl('https://exam.example.vn/old?token=private#fragment',id));
 assert.equal(value.origin,'https://exam.example.vn');assert.equal(value.pathname,'/');
 assert.equal(value.searchParams.get('continue'),`/exam-rounds/${id}`);assert.equal(value.searchParams.size,1);assert.equal(value.hash,'');
 for(const origin of ['javascript:alert(1)','ftp://example.vn','https://user:pass@example.vn','invalid'])assert.equal(buildRoundJoinUrl(origin,id),'');
 assert.equal(buildRoundJoinUrl('https://exam.example.vn','invalid'),'');
 assert.equal(isLocalRoundJoinUrl(buildRoundJoinUrl('http://localhost:3110',id)),true);
 assert.equal(isLocalRoundJoinUrl(buildRoundJoinUrl('http://192.168.1.2:3110',id)),false);
});

import {startButtonState,sortParticipantRounds} from './examRounds.js';
test('Nhãn bắt đầu/resume và lý do khóa lấy từ trạng thái tham gia của chính người dùng',()=>{
 assert.equal(startButtonState({participation:{canStart:true}}).label,'Bắt đầu làm bài');assert.equal(startButtonState({participation:{canStart:true}}).disabled,false);
 const resumed=startButtonState({participation:{activeAttempt:{id:'own'}}});assert.equal(resumed.label,'Tiếp tục làm bài');assert.equal(resumed.resume,true);
 for(const reason of ['Chưa đến giờ','Đã kết thúc','Hết lượt','Đã đạt']){const state=startButtonState({participation:{canStart:false,reason}});assert.equal(state.disabled,true);assert.equal(state.reason,reason);}
 assert.equal(startButtonState(null).disabled,true);
});
test('Đợt đang làm và đang mở/chạy thử xếp trước đợt tương lai và đã kết thúc',()=>{
 const now=Date.parse('2026-11-12T00:00:00Z');const rows=[{id:'closed',status:'CLOSED'},{id:'future',status:'OPEN',startAt:'2026-11-13T00:00:00Z'},{id:'open',status:'OPEN'},{id:'active',status:'OPEN',participation:{activeAttempt:{id:'a'}}},{id:'trial',status:'OPEN',trialStartAt:'2026-11-11T00:00:00Z',startAt:'2026-11-13T00:00:00Z'}];
 assert.deepEqual(sortParticipantRounds(rows,now).map(x=>x.id),['active','open','trial','future','closed']);assert.equal(rows[0].id,'closed');assert.deepEqual(sortParticipantRounds(null),[]);
});
test('Form đợt không gửi trạng thái kể cả khi dữ liệu sửa có OPEN',()=>{
 assert.equal(Object.hasOwn(roundPayload({title:'Test',status:'OPEN'}),'status'),false);
});
