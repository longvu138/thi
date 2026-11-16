const test = require('node:test'); const assert = require('node:assert/strict');
const { validateParticipant, participantKey } = require('./participant-identity');
const value = { fullName: 'Nguyễn Văn An', partyCommittee: 'Đảng bộ A', partyBranch: 'Chi bộ 1' };
test('Nhận diện người dự thi bỏ khoảng trắng thừa, hoa thường và khác biệt Unicode tổ hợp', () => {
 const normalized = validateParticipant({ ...value, fullName: '  Nguyễn   Văn An  ' }); assert.equal(normalized.fullName, value.fullName);
 assert.equal(participantKey(value), participantKey({ ...value, fullName: 'nguyễn văn an'.normalize('NFD'), partyBranch: ' CHI   BỘ 1 ' }));
 assert.notEqual(participantKey(value), participantKey({ ...value, fullName: 'Nguyen Van An' }));
 assert.notEqual(participantKey(value), participantKey({ ...value, partyBranch: 'Chi bộ 2' }));
});
test('Thông tin người dự thi phải đủ ba trường, không nhận vai trò hoặc ID tự truyền', () => {
 for (const data of [{}, { ...value, fullName: '' }, { ...value, partyBranch: 123 }, { ...value, role: 'ADMIN' }, { ...value, userId: '1' }, { ...value, fullName: 'a'.repeat(256) }]) assert.throws(() => validateParticipant(data), { statusCode: 422 });
});
