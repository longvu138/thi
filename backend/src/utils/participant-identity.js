const crypto = require('node:crypto');
const { httpError } = require('./http-error');
const normalizeParticipantText = value => typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
const participantKey = ({ fullName, partyCommittee, partyBranch }) => crypto.createHash('sha256').update(JSON.stringify([fullName, partyCommittee, partyBranch].map(value => normalizeParticipantText(value).toLocaleLowerCase('vi')))).digest('hex');
const validateParticipant = body => {
 if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['fullName', 'partyCommittee', 'partyBranch'].includes(key))) throw httpError(422, 'Thông tin người dự thi không hợp lệ');
 const result = {};
 for (const [key, label] of [['fullName', 'Họ và tên'], ['partyCommittee', 'Đảng bộ'], ['partyBranch', 'Chi bộ']]) {
  const value = normalizeParticipantText(body[key]);
  if (!value || value.length > 255 || /[\p{Cc}\p{Cf}]/u.test(value)) throw httpError(422, `${label} là bắt buộc, không quá 255 ký tự và không chứa ký tự điều khiển`);
  result[key] = value;
 }
 return result;
};
module.exports = { normalizeParticipantText, participantKey, validateParticipant };
