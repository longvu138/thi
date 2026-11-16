const express = require("express");

const authController = require("./auth.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { loginIpLimiter, loginLimiter, participantLimiter } = require("../../middlewares/rate-limit.middleware");

const router = express.Router();

/**
 * POST /auth/login
 * Đăng nhập và nhận cookie phiên HttpOnly.
 * Quyền: public. Giới hạn tần suất theo tài khoản và theo IP.
 * Body: { username: string, password: string }.
 * Success 200: { expiresIn, sessionId, csrfToken, user: { id, username, fullName, role } } và Set-Cookie.
 * Fail: 422 thiếu username/password; 401 sai tài khoản/mật khẩu hoặc tài khoản bị khóa; 429 quá số lần thử.
 */
router.post("/enter", participantLimiter, (req, res, next) => { req.sensitiveBody = true; next(); }, authController.enter);

router.post("/login", loginIpLimiter, loginLimiter, authController.login);

/**
 * POST /auth/logout
 * Thu hồi phiên hiện tại và xóa cookie. Quyền: đã đăng nhập, cần header X-CSRF-Token.
 */
router.post("/logout", authenticate, authController.logout);

/**
 * GET /auth/me
 * Trả về người dùng hiện tại và CSRF token mới. Quyền: đã đăng nhập.
 * Success 200: { csrfToken, user: { id, username, fullName, role } }.
 * Fail: 401 phiên không hợp lệ/hết hạn; 404 tài khoản không còn tồn tại.
 */
router.get("/me", authenticate, authController.me);

module.exports = router;
