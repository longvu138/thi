import { APP_NAME } from "../constants/app.js";

export const getDefaultAuthenticatedPath = user => user?.role === "USER" ? "/exam-rounds" : user?.role === "ADMIN" ? "/admin/exam-rounds" : "/home";

/**
 * Nguồn duy nhất cho menu (sidebar, bottom nav) và điều kiện vào route.
 * `roles`: danh sách vai trò được thấy mục; bỏ trống là mọi tài khoản đã đăng nhập.
 * Menu chỉ để hiển thị — mọi API vẫn phân quyền tại backend.
 * Các phân hệ của docs/PLAN.md (câu hỏi theo đợt, đợt kiểm tra, làm bài, kết quả, báo cáo)
 * thêm mục tại đây khi triển khai.
 */
export const NAV_ITEMS = Object.freeze([
  { key: "admin-rounds", path: "/admin/exam-rounds", label: "Đợt kiểm tra", title: "Quản lý đợt kiểm tra", roles: ["ADMIN"], matchPrefix: true },
  { key: "exam-rounds", path: "/exam-rounds", label: "Đợt kiểm tra", title: "Đợt kiểm tra", roles: ["USER"], matchPrefix: true },
  { key: "results", path: "/my-results", label: "Kết quả cá nhân", title: "Kết quả cá nhân", roles: ["USER"] },
  { key: "guide", path: "/admin/guide", label: "Hướng dẫn dự thi", title: "Hướng dẫn dự thi", roles: ["ADMIN"] },
  { key: "users", path: "/admin/users", label: "Tài khoản", title: "Quản lý tài khoản", roles: ["ADMIN"] },
  { key: "home", path: "/home", label: "Trang chủ", title: "Trang chủ", roles: ["USER"] },
]);

const NAV_ITEM_BY_KEY = Object.freeze(Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item])));

export const getNavItem = (key) => NAV_ITEM_BY_KEY[key] || null;

export const canAccessNavItem = (currentUser, itemOrKey) => {
  const item = typeof itemOrKey === "string" ? getNavItem(itemOrKey) : itemOrKey;
  if (!item || !currentUser) return false;
  const roles = Array.isArray(item.roles) ? item.roles : [];
  return roles.length === 0 || roles.includes(currentUser.role);
};

export const getVisibleNavItems = (currentUser) =>
  NAV_ITEMS.filter((item) => canAccessNavItem(currentUser, item));

export const isNavItemActive = (item, pathname = "") =>
  pathname === item?.path || Boolean(item?.matchPrefix && pathname.startsWith(`${item.path}/`));

const STANDALONE_TITLES = Object.freeze({
  "/guide": "Hướng dẫn dự thi",
  "/receipts": "Tra cứu phiếu kết quả",
  "/login": "Vào thi",
  "/admin/login": "Đăng nhập quản trị",
});

export const getRouteTitle = (pathname = "/") => {
  if (/^\/admin\/exam-rounds\/[^/]+\/reports$/.test(pathname)) return "Báo cáo đợt kiểm tra";
  if (/^\/attempts\/[^/]+\/receipt$/.test(pathname)) return "Phiếu kết quả";
  if (/^\/attempts\/[^/]+\/result$/.test(pathname)) return "Kết quả lượt thi";
  if (/^\/attempts\/[^/]+$/.test(pathname)) return "Làm bài kiểm tra";
  if (STANDALONE_TITLES[pathname]) return STANDALONE_TITLES[pathname];
  const item = NAV_ITEMS.find((navItem) => isNavItemActive(navItem, pathname));
  return item?.title || "";
};

export const formatDocumentTitle = (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME);
