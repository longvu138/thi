const db = require("../../config/database");
const authSessionsService = require("./auth-sessions.service");
const { auditLog } = require("../../utils/audit-log");
const { clearAuthCookie, createCsrfToken } = require("../../utils/auth-cookie");
const { buildUserResponse } = require("./auth.service");

const logout = async (req, res, next) => {
  try {
    await authSessionsService.revokeSession({
      sessionId: req.authSession.id,
      userId: req.user.id,
      revokedBy: req.user.id,
      reason: "logout",
    });
    clearAuthCookie(res);
    auditLog(req, "info", { event: "auth_logout", statusCode: 200 });
    return res.json({ message: "Đăng xuất thành công" });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await db("users").where({ id: req.user.id }).whereNull("deleted_at").first();
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản tương ứng",
      });
    }

    return res.json({
      csrfToken: createCsrfToken(req.authSession.id),
      user: buildUserResponse(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { logout, me };
