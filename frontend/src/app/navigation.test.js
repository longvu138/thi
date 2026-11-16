import assert from "node:assert/strict";
import test from "node:test";
import { canAccessNavItem, formatDocumentTitle, getDefaultAuthenticatedPath, getRouteTitle, getVisibleNavItems } from "./navigation.js";

test("menu theo vai trò: chưa đăng nhập không thấy mục nào", () => {
  assert.equal(canAccessNavItem(null, "home"), false);
  assert.equal(canAccessNavItem({ role: "USER" }, "home"), true);
  assert.equal(canAccessNavItem({ role: "ADMIN" }, "khong-ton-tai"), false);
  assert.deepEqual(getVisibleNavItems({ role: "USER" }).map((item) => item.key), ["exam-rounds", "results", "home"]);
});

test("mục có roles chỉ hiện với vai trò được khai báo", () => {
  const adminOnly = { key: "x", path: "/x", roles: ["ADMIN"] };
  assert.equal(canAccessNavItem({ role: "ADMIN" }, adminOnly), true);
  assert.equal(canAccessNavItem({ role: "USER" }, adminOnly), false);
});

test("tiêu đề trang theo route", () => {
  assert.equal(getRouteTitle("/login"), "Vào thi");
  assert.equal(getRouteTitle("/home"), "Trang chủ");
  assert.equal(getRouteTitle("/khong-ton-tai"), "");
  assert.equal(formatDocumentTitle("Trang chủ"), "Trang chủ · Trắc Nghiệm Trực Tuyến");
  assert.equal(formatDocumentTitle(""), "Trắc Nghiệm Trực Tuyến");
});

test("đường dẫn mặc định sau đăng nhập là trang chủ", () => {
  assert.equal(getDefaultAuthenticatedPath(), "/home");
});

test("Quản lý tài khoản chỉ dành cho ADMIN", () => {
 assert.equal(canAccessNavItem({role:"ADMIN"},"users"),true);
 assert.equal(canAccessNavItem({role:"USER"},"users"),false);
 assert.equal(getRouteTitle("/admin/users"),"Quản lý tài khoản");
});

test("Người dự thi vào danh sách đợt kiểm tra, ADMIN có đăng nhập riêng",()=>{
 assert.equal(getDefaultAuthenticatedPath({role:"USER"}),"/exam-rounds");assert.equal(getDefaultAuthenticatedPath({role:"ADMIN"}),"/admin/exam-rounds");assert.equal(getRouteTitle("/admin/login"),"Đăng nhập quản trị");
});

 test("Kết quả cá nhân chỉ cho USER và có tiêu đề riêng cho lượt thi",()=>{
 assert.equal(canAccessNavItem({role:"USER"},"results"),true);
 assert.equal(canAccessNavItem({role:"ADMIN"},"results"),false);
 assert.equal(getRouteTitle("/attempts/test/result"),"Kết quả lượt thi");
 assert.equal(getRouteTitle("/my-results"),"Kết quả cá nhân");
 });

test("Báo cáo theo đợt có tiêu đề riêng trong khu ADMIN",()=>{
 assert.equal(getRouteTitle("/admin/exam-rounds/test/reports"),"Báo cáo đợt kiểm tra");
 assert.equal(canAccessNavItem({role:"USER"},"admin-rounds"),false);
});
