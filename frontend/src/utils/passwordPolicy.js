import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '../constants/password.js';
// Giá trị rỗng để Form kiểm tra bắt buộc; cùng cách tính length với backend.
export const getPasswordChecks = password => ({minLength:!password || (typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH)});

/** Danh sách lỗi tiếng Việt; mảng rỗng nghĩa là hợp lệ (để Form tự báo "bắt buộc" khi rỗng). */
export const getPasswordProblems = (password, options) => {
  const checks = getPasswordChecks(password, options);
  return PASSWORD_RULES.filter((rule) => !checks[rule.key]).map((rule) => rule.error);
};

/** Rule cho AntD Form.Item. `getUsername` có thể trả về null khi chưa biết tài khoản. */
export const passwordPolicyRule = (getUsername = () => null) => ({
  validator(_, value) {
    const [problem] = getPasswordProblems(value, { username: getUsername() });
    return problem ? Promise.reject(new Error(problem)) : Promise.resolve();
  },
});

export const PASSWORD_RULES_SUMMARY_ERROR = "Mật khẩu mới chưa đạt yêu cầu bên dưới";

/**
 * Rule dùng khi đã hiển thị danh sách quy tắc trực tiếp (✓) dưới ô nhập: không lặp lại nội dung
 * quy tắc đã liệt kê, chỉ báo lỗi chung; lỗi không có trong danh sách (quá dài) vẫn báo cụ thể.
 */
export const passwordPolicyRuleWithVisibleChecklist = (getUsername = () => null) => ({
  validator(_, value) {
    const checks = getPasswordChecks(value, { username: getUsername() });
    const failed = PASSWORD_RULES.filter((rule) => !checks[rule.key]);
    if (!failed.length) return Promise.resolve();
    const hidden = failed.find((rule) => !rule.text);
    return Promise.reject(new Error(hidden ? hidden.error : PASSWORD_RULES_SUMMARY_ERROR));
  },
});

const PASSWORD_CHARSETS = Object.freeze([
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@#$%*-_=+?",
]);

const defaultRandomValues = (array) => globalThis.crypto.getRandomValues(array);

// Lấy chỉ số ngẫu nhiên không lệch (rejection sampling) trong [0, max).
const randomIndex = (max, getRandomValues) => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
};

/**
 * Sinh mật khẩu ngẫu nhiên mạnh (ASCII, có chữ hoa, chữ thường, số, ký tự đặc biệt) đạt chính sách.
 * `getRandomValues` mặc định là crypto.getRandomValues; truyền vào để kiểm thử.
 */
export const generateStrongPassword = ({ length = 16, username, getRandomValues = defaultRandomValues } = {}) => {
  const size = Math.min(Math.max(Number(length) || 16, PASSWORD_MIN_LENGTH, PASSWORD_CHARSETS.length), 128);
  const all = PASSWORD_CHARSETS.join("");
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const chars = PASSWORD_CHARSETS.map((set) => set[randomIndex(set.length, getRandomValues)]);
    while (chars.length < size) chars.push(all[randomIndex(all.length, getRandomValues)]);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1, getRandomValues);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const password = chars.join("");
    if (!getPasswordProblems(password, { username }).length) return password;
  }
  throw new Error("Không tạo được mật khẩu ngẫu nhiên");
};
