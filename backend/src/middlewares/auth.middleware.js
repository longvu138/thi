const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');
const authSessionsService = require('../modules/auth/auth-sessions.service');
const { getClientInfo } = require('../utils/client-info');
const {
  clearAuthCookie,
  getAuthToken,
  verifyCsrfToken,
} = require('../utils/auth-cookie');

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'exam-backend';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'exam-web';

const getSecurityLogContext = (req) => {
  const client = req.clientInfo || getClientInfo(req);
  return {
    requestId: req.requestId,
    sessionId: req.authSession?.public_id,
    userId: req.user?.id,
    method: req.method,
    path: req.originalUrl,
    ip: client.ipAddress,
    userAgent: client.userAgent,
    browser: client.browser,
    operatingSystem: client.os,
    deviceType: client.deviceType,
  };
};

const authenticate = async (req, res, next) => {
  const token = getAuthToken(req);

  if (!token) {
    logger.warn({ event: 'auth_missing_token', ...getSecurityLogContext(req) });
    return res.status(401).json({
      message: 'Không có quyền truy cập, vui lòng đăng nhập',
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    clearAuthCookie(res);
    logger.warn({ event: 'auth_invalid_token', ...getSecurityLogContext(req) });
    return res.status(401).json({
      message: 'Mã xác thực không hợp lệ hoặc đã hết hạn',
    });
  }

  try {
    const authState = payload.jti
      ? await authSessionsService.getActiveSessionWithUser(payload.jti, payload.sub)
      : null;
    const user = authState?.user;
    const session = authState?.session;

    const tokenVersion = Number(payload.tokenVersion || 0);
    if (
      !user ||
      !user.is_active ||
      !session ||
      Number(user.token_version || 0) !== tokenVersion ||
      Number(session.token_version || 0) !== tokenVersion
    ) {
      logger.warn({
        event: 'auth_session_rejected',
        ...getSecurityLogContext(req),
        targetUserId: payload.sub,
        // Never log the raw jti (it is the session secret); a short hash is enough to correlate.
        targetSessionFingerprint: payload.jti ? crypto.createHash('sha256').update(String(payload.jti)).digest('hex').slice(0, 16) : undefined,
      });
      clearAuthCookie(res);
      return res.status(401).json({
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn',
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    req.authSession = session;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token'];
      if (!verifyCsrfToken(session.id, csrfToken)) {
        logger.warn({ event: 'auth_csrf_rejected', ...getSecurityLogContext(req) });
        return res.status(403).json({
          code: 'CSRF_TOKEN_INVALID',
          message: 'Yêu cầu bảo mật không hợp lệ, vui lòng tải lại trang',
        });
      }
    }
    await authSessionsService.touchSession(session);
    return next();
  } catch (error) {
    return next(error);
  }
};

// Phân quyền ADMIN/USER luôn kiểm tra tại backend; dùng sau authenticate.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    logger.warn({ event: 'permission_denied', ...getSecurityLogContext(req), requiredRoles: roles });
    return res.status(403).json({
      message: 'Bạn không có quyền thực hiện thao tác này',
    });
  }
  return next();
};

const requireAdmin = requireRole(ROLES.ADMIN);

module.exports = {
  authenticate,
  requireAdmin,
  requireRole,
};
