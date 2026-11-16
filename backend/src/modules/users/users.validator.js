const { httpError } = require('../../utils/http-error');
const { assertPasswordPolicy } = require('../../utils/password-policy');
const validateUser = (body, creating = false, username) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(422,'Dữ liệu tài khoản không hợp lệ');
  const allowed = creating ? ['username','fullName','password','role','isActive'] : ['fullName','password','role','isActive'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw httpError(422,'Trường dữ liệu tài khoản không hợp lệ');
  const result = {};
  if (creating) {
    if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,64}$/.test(body.username.trim())) throw httpError(422,'Tên tài khoản phải có 3–64 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang');
    result.username = body.username.trim(); username = result.username;
  }
  if (creating || body.fullName !== undefined) {
    if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.trim().length > 255) throw httpError(422,'Họ tên là bắt buộc và không quá 255 ký tự');
    result.full_name = body.fullName.trim();
  }
  if (creating || body.password !== undefined) {
    if (typeof body.password !== 'string') throw httpError(422,'Mật khẩu là bắt buộc');
    assertPasswordPolicy(body.password,{username}); result.password = body.password;
  }
  if (body.role !== undefined && !['ADMIN','USER'].includes(body.role)) throw httpError(422,'Vai trò không hợp lệ');
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw httpError(422,'Trạng thái hoạt động phải là true hoặc false');
  if (body.role !== undefined || creating) result.role = body.role || 'USER';
  if (body.isActive !== undefined || creating) result.is_active = body.isActive === false ? 0 : 1;
  if (!Object.keys(result).length) throw httpError(422,'Vui lòng cung cấp thông tin cần sửa');
  return result;
};
module.exports = { validateUser };
