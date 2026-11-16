// Đồng bộ với backend/src/utils/password-policy.js.
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_RULES = Object.freeze([
 {key:'minLength',text:`Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`,error:`Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`},
]);
