// Đồng bộ với backend/src/constants/roles.js. Chỉ dùng để hiển thị menu; phân quyền thật nằm ở backend.
export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  USER: "USER",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: "Quản trị viên",
  [ROLES.USER]: "Người dự kiểm tra",
});

export const getRoleLabel = (role) => ROLE_LABELS[role] || "Tài khoản";
