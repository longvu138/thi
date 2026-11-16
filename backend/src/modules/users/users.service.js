const db = require('../../config/database');
const { createUuid } = require('../../utils/uuid');
const { hashPassword } = require('../../utils/password-hash');
const { httpError } = require('../../utils/http-error');
const { parsePagination, buildPagination } = require('../../utils/pagination');
const { containsPattern } = require('../../utils/sql-like');
const { toIsoUtc } = require('../../utils/datetime');
const { revokeAllSessions } = require('../auth/auth-sessions.service');
const { participantKey, normalizeParticipantText } = require('../../utils/participant-identity');
const { validateUser } = require('./users.validator');
const serialize = row => ({ id:row.id, username:row.username, fullName:row.full_name, role:row.role, isActive:Boolean(row.is_active), partyCommittee:row.party_committee || null, partyBranch:row.party_branch || null, isParticipant:Boolean(row.participant_key), lastLoginAt:toIsoUtc(row.last_login_at), createdAt:toIsoUtc(row.created_at), updatedAt:toIsoUtc(row.updated_at) });
const get = async id => {
  const row = await db('users').where({id}).whereNull('deleted_at').first();
  if (!row) throw httpError(404,'Không tìm thấy tài khoản');
  return row;
};
const list = async (query = {}) => {
  const pagination = parsePagination(query);
  const base = db('users').whereNull('deleted_at');
  if (query.search) base.where(function () { this.where('username','like',containsPattern(String(query.search))).orWhere('full_name','like',containsPattern(String(query.search))); });
  const [{total}] = await base.clone().count('* as total');
  const rows = await base.clone().orderBy('created_at','desc').orderBy('id').limit(pagination.limit).offset(pagination.offset);
  return {items:rows.map(serialize),pagination:buildPagination(pagination,total)};
};
const duplicate = error => { if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) throw httpError(409,'Tên tài khoản đã được sử dụng'); throw error; };
const create = async body => {
  const input = validateUser(body,true);
  const password_hash = await hashPassword(input.password); delete input.password;
  const id = createUuid();
  try { await db('users').insert({id,...input,password_hash}); } catch(error) { duplicate(error); }
  return serialize(await get(id));
};
// Khóa cùng một dòng cố định trước khi thay đổi quyền/trạng thái tài khoản.
// Mọi thao tác dùng chung khóa này để không thể đồng thời loại bỏ hai admin cuối.
const update = async (id, body, actorId, removing = false) => {
  const previous = await get(id);
  const input = removing ? {} : validateUser(body,false,previous.username);
  if (input.password !== undefined) { input.password_hash = await hashPassword(input.password); delete input.password; }
  return db.transaction(async trx => {
    await trx('users').orderBy('id').forUpdate().first();
    const row = await trx('users').where({id}).whereNull('deleted_at').forUpdate().first();
    if (!row) throw httpError(404,'Không tìm thấy tài khoản');
    const disabling = removing || input.is_active === 0 || (input.role && input.role !== 'ADMIN');
    if (actorId === id && (removing || input.is_active === 0)) throw httpError(409,'Không thể tự khóa hoặc xóa tài khoản đang sử dụng');
    if (row.role === 'ADMIN' && row.is_active && disabling) {
      const [{total}] = await trx('users').where({role:'ADMIN',is_active:1}).whereNull('deleted_at').count('* as total');
      if (Number(total) <= 1) throw httpError(409,'Không thể vô hiệu hóa quản trị viên cuối cùng');
    }
    const revoke = removing || input.is_active === 0 || input.password_hash || (input.role && input.role !== row.role);
    const changes = {...input,updated_at:trx.fn.now()};
    if (row.participant_key && input.role === 'ADMIN') throw httpError(409,'Không thể chuyển người dự thi không mật khẩu thành quản trị viên');
    if (row.participant_key && input.full_name !== undefined) {
      changes.full_name = normalizeParticipantText(input.full_name);
      changes.participant_key = participantKey({fullName:changes.full_name,partyCommittee:row.party_committee,partyBranch:row.party_branch});
    }
    if (removing) changes.deleted_at = trx.fn.now();
    if (revoke) {
      changes.token_version = Number(row.token_version)+1;
      await revokeAllSessions({userId:id,revokedBy:actorId,reason:'account_changed',trx});
    }
    try { await trx('users').where({id}).update(changes); } catch(error) {
      if (error.code === 'ER_DUP_ENTRY') throw httpError(409,'Thông tin người dự thi đã được sử dụng');
      throw error;
    }
    return {before:serialize(row),after:removing ? null : serialize(await trx('users').where({id}).first())};
  });
};
module.exports = { list, get, serialize, create, update };
