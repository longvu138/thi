import test from 'node:test'; import assert from 'node:assert/strict';
import { isSignInRequest, loginPathFor } from './authRouting.js';
test('Lỗi đăng nhập tài khoản hoặc vào thi không bị xử lý như phiên hết hạn', () => {
 assert.equal(isSignInRequest('/auth/login'), true); assert.equal(isSignInRequest('/auth/enter'), true); assert.equal(isSignInRequest('/auth/me'), false);
});
test('Phiên hết hạn chuyển về đúng màn quản trị hoặc người dự thi', () => {
 assert.equal(loginPathFor('/admin/users'), '/admin/login'); assert.equal(loginPathFor('/admin/login'), '/admin/login'); assert.equal(loginPathFor('/exam-rounds'), '/');
});
import {participantReturnPath,loginRedirectFor} from './authRouting.js';
test('Đăng nhập lại chỉ khôi phục đường dẫn lượt thi hợp lệ, không mở redirect tùy ý',()=>{
 const path='/attempts/11111111-1111-4111-8111-111111111111';const redirect=loginRedirectFor(path);
 assert.equal(participantReturnPath(redirect.slice(redirect.indexOf('?'))),path);
 for(const target of ['https://evil.example','//evil.example','/admin/users','/attempts/invalid'])assert.equal(participantReturnPath(`?continue=${encodeURIComponent(target)}`),null);
});
test('Quét QR giữ đợt sau đăng nhập, từ chối đường dẫn giả và redirect ngoài',()=>{
 const path='/exam-rounds/11111111-1111-4111-8111-111111111111';
 const login=loginRedirectFor(path);
 assert.equal(participantReturnPath(new URL(login,'https://exam.example.vn').search),path);
 for(const value of ['/exam-rounds/invalid','/exam-rounds/../admin/users','//evil.example/exam-rounds/11111111-1111-4111-8111-111111111111','/exam-rounds/11111111-1111-4111-8111-111111111111?userId=other'])assert.equal(participantReturnPath(`?continue=${encodeURIComponent(value)}`),null);
});
import {isPublicSessionProbe} from './authRouting.js';
test('Tra cứu mở công khai khi không có phiên, 401 thao tác khác vẫn xử lý',()=>{
 assert.equal(isPublicSessionProbe('/guide','/auth/me'),false);assert.equal(isPublicSessionProbe('/receipts','/auth/me'),true);
 for(const [path,url]of [['/guide','/admin/guide'],['/admin/guide','/auth/me'],['/attempts/id','/auth/me'],['/guide','/attempts/id/submit']])assert.equal(isPublicSessionProbe(path,url),false);
});
