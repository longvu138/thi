// Hai vai trò cố định của hệ thống kiểm tra nhận thức (không có ma trận quyền).
const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  USER: "USER",
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

module.exports = { ROLES, ROLE_VALUES };
