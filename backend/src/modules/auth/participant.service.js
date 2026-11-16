const crypto = require('node:crypto');
const db = require('../../config/database');
const { createUuid } = require('../../utils/uuid');
const { hashPassword } = require('../../utils/password-hash');
const { httpError } = require('../../utils/http-error');
const { validateParticipant, participantKey } = require('../../utils/participant-identity');
const assertAvailable = user => {
 if (user?.deleted_at || !user?.is_active || user.role !== 'USER') throw httpError(403, 'Thông tin người dự thi đã bị khóa hoặc không được phép truy cập; vui lòng liên hệ quản trị viên');
 return user;
};
const enterParticipant = async body => {
 const identity = validateParticipant(body);
 const key = participantKey(identity);
 let user = await db('users').where({ participant_key: key }).first();
 if (!user) {
  // Mật khẩu ngẫu nhiên không phát hành cho người dự thi; vẫn giữ schema/hash Argon2id hiện có.
  const id = createUuid(); const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  try {
   await db('users').insert({ id, username: `participant_${id}`, full_name: identity.fullName,
    party_committee: identity.partyCommittee, party_branch: identity.partyBranch, participant_key: key,
    role: 'USER', is_active: 1, token_version: 0, password_hash: passwordHash });
  } catch (error) {
   if (error.code !== 'ER_DUP_ENTRY') throw error;
   // Unique key là nguồn quyết định khi nhiều lần vào thi đồng thời.
  }
  user = await db('users').where({ participant_key: key }).first();
 }
 assertAvailable(user);
 await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });
 return user;
};
module.exports = { enterParticipant };
