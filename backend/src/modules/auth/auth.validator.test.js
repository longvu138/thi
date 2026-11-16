const test = require("node:test");
const assert = require("node:assert/strict");
const { validateLoginInput } = require("./auth.validator");

test("đăng nhập với payload thiếu hoặc sai kiểu trả 422 thay vì lỗi nội bộ", () => {
  for (const body of [null, {}, { username: 123, password: "E2E_password" }, { username: "e2e_user", password: [] }]) {
    assert.throws(() => validateLoginInput(body), (error) => error.statusCode === 422);
  }
  assert.equal(validateLoginInput({ username: " e2e_user ", password: "E2E_password" }).username, "e2e_user");
});
