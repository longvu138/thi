const { httpError } = require("../../utils/http-error");

const validateLoginInput = (body = {}) => {
  if (!body || typeof body.username !== "string" || !body.username.trim() || typeof body.password !== "string" || !body.password) {
    throw httpError(422, "Tên tài khoản và mật khẩu là bắt buộc");
  }
  return { username: body.username.trim(), password: body.password };
};

module.exports = { httpError, validateLoginInput };
