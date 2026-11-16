const { verifyPassword } = require("../../utils/password-hash");
const { validateLoginInput, httpError } = require("./auth.validator");
const jwt = require("jsonwebtoken");
const db = require("../../config/database");
const authSessionsService = require("./auth-sessions.service");
const { createCsrfToken, setAuthCookie } = require("../../utils/auth-cookie");

const buildUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.full_name,
  role: user.role,
  partyCommittee: user.party_committee || null,
  partyBranch: user.party_branch || null,
  isParticipant: Boolean(user.participant_key),
});

const issueSessionCookie = async (user, req, res) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw httpError(500, "Chưa cấu hình khóa xác thực JWT_SECRET");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const tokenVersion = Number(user.token_version || 0);
  const session = await authSessionsService.createSession({
    req,
    userId: user.id,
    tokenVersion,
    expiresIn,
  });
  const accessToken = jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      tokenVersion,
    },
    secret,
    {
      algorithm: "HS256",
      audience: process.env.JWT_AUDIENCE || "exam-web",
      issuer: process.env.JWT_ISSUER || "exam-backend",
      jwtid: session.id,
      expiresIn,
    },
  );
  setAuthCookie(res, accessToken, session.expiresAt);
  return {
    expiresIn,
    sessionId: session.publicId,
    csrfToken: createCsrfToken(session.id),
  };
};

const authenticateLogin = async (input) => {
  const { username, password } = validateLoginInput(input);
  const user = await db("users").where({ username }).whereNull("deleted_at").first();
  // Luôn so mật khẩu một lần (hash giả khi không có tài khoản) để thời gian phản hồi đồng đều.
  const passwordMatches = await verifyPassword(password, user?.password_hash);
  if (!user?.is_active || !user.password_hash || !passwordMatches) {
    const error = httpError(401, "Tên tài khoản hoặc mật khẩu không chính xác");
    error.authReason = user && !user.is_active ? "inactive_account" : "invalid_credentials";
    throw error;
  }
  await db("users").where({ id: user.id }).update({ last_login_at: db.fn.now() });
  return user;
};

module.exports = { buildUserResponse, issueSessionCookie, authenticateLogin };
