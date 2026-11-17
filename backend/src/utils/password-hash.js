// Argon2id bằng WebAssembly (hash-wasm): không cần biên dịch native, chạy được trên shared hosting.
// Định dạng PHC ($argon2id$v=19$...) tương thích với hash do thư viện argon2 native tạo trước đây.
const { randomBytes } = require('node:crypto');
const { argon2id, argon2Verify } = require('hash-wasm');

const OPTIONS = { parallelism: 1, iterations: 2, memorySize: 19456, hashLength: 32, outputType: 'encoded' };

const hashPassword = password => argon2id({ ...OPTIONS, password: String(password), salt: randomBytes(16) });

let dummyHash;
const safeVerify = async (password, hash) => {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    // Hash không đúng định dạng được xem như mật khẩu sai, không làm lỗi request.
    return false;
  }
};

const verifyPassword = async (password, hash) => {
  dummyHash ||= hashPassword('exam-dummy-password-for-timing');
  // Vẫn băm khi không có hash để thời gian phản hồi không lộ tài khoản có tồn tại hay không.
  const matches = await safeVerify(String(password || ''), hash || await dummyHash);
  return Boolean(hash) && matches;
};

module.exports = { hashPassword, verifyPassword };
