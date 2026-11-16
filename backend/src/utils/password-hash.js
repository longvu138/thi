const argon2 = require('argon2');
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const hashPassword = password => argon2.hash(password, OPTIONS);
let dummyHash;
const verifyPassword = async (password, hash) => {
  dummyHash ||= hashPassword('exam-dummy-password-for-timing');
  const matches = await argon2.verify(hash || await dummyHash, String(password || ''));
  return Boolean(hash) && matches;
};
module.exports = { hashPassword, verifyPassword };
