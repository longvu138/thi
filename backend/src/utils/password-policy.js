const { AppError } = require('./http-error');
const MIN_PASSWORD_LENGTH = 6;
const validatePassword = password => {
  const valid = typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
  return {valid,errors:valid?[]:[`ít nhất ${MIN_PASSWORD_LENGTH} ký tự`]};
};
const assertPasswordPolicy = password => {
  const result=validatePassword(password);
  if(!result.valid) throw new AppError(422,`Mật khẩu phải có ${result.errors.join(', ')}`,'PASSWORD_POLICY_FAILED');
};
module.exports={MIN_PASSWORD_LENGTH,validatePassword,assertPasswordPolicy};
