export const isSignInRequest = url => /\/auth\/(login|enter)$/.test(url || '');
export const loginPathFor = pathname => pathname?.startsWith('/admin') ? '/admin/login' : '/login';

const isAttemptPath = path => /^\/attempts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path || '');
const isRoundPath = path => /^\/exam-rounds\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path || '');
const canContinue = path => isAttemptPath(path) || isRoundPath(path);
export const participantReturnPath = search => {const path=new URLSearchParams(search).get('continue');return canContinue(path)?path:null;};
export const loginRedirectFor = pathname => canContinue(pathname)?`/login?continue=${encodeURIComponent(pathname)}`:loginPathFor(pathname);

// Trang công khai vẫn hiển thị khi kiểm tra phiên nền trả 401.
export const isPublicSessionProbe=(pathname,url)=>['/receipts','/guide'].includes(pathname)&&/\/auth\/me$/.test(url||'');
