const { auditLog } = require("../../utils/audit-log");
const { authenticateLogin, buildUserResponse, issueSessionCookie } = require("./auth.service");

const login = async (req, res, next) => {
  try {
    const user = await authenticateLogin(req.body);
    const auth = await issueSessionCookie(user, req, res);
    auditLog(req, "info", { event: "auth_login_success", username: user.username, userId: user.id, sessionId: auth.sessionId, statusCode: 200 });
    return res.json({ ...auth, user: buildUserResponse(user) });
  } catch (error) {
    if ([401, 422].includes(error.statusCode)) auditLog(req, "warn", { event: "auth_login_failed", username: req.body?.username, reason: error.authReason || "missing_credentials", statusCode: error.statusCode });
    return next(error);
  }
};
module.exports = { login };

const enter = async (req, res, next) => {
 try {
  const user = await require('./participant.service').enterParticipant(req.body);
  const auth = await issueSessionCookie(user, req, res);
  auditLog(req, 'info', { event: 'participant_entered', userId: user.id, sessionId: auth.sessionId, statusCode: 200 });
  return res.json({ ...auth, user: buildUserResponse(user) });
 } catch (error) { return next(error); }
};
module.exports.enter = enter;
