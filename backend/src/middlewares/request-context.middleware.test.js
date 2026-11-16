const test = require("node:test");
const assert = require("node:assert/strict");
const { getRequestId } = require("./request-context.middleware");

const req = (value) => ({ get: () => value });

test("X-Request-Id chỉ nhận [A-Za-z0-9-] tối đa 64 ký tự", () => {
  assert.equal(getRequestId(req("abc-DEF-123")), "abc-DEF-123");
  for (const value of ["x".repeat(65), "a b", "a\nb", "<script>", "", undefined]) {
    const generated = getRequestId(req(value));
    assert.notEqual(generated, value);
    assert.match(generated, /^[0-9a-f-]{36}$/);
  }
});


test('access log ticket không chứa bộ lọc thông tin cá nhân', t => {
  const logger = require('../utils/logger');
  const { EventEmitter } = require('node:events');
  const { accessLog } = require('./request-context.middleware');
  const captured = [];
  t.mock.method(logger, 'info', value => captured.push(value));
  const response = new EventEmitter(); response.statusCode = 200; response.getHeader = () => null;
  accessLog({ method: 'GET', originalUrl: '/api/tickets?q=E2E_PRIVATE', sensitiveBody: true, clientInfo: {} }, response, () => {});
  response.emit('finish');
  assert.equal(captured[0].path, '/api/tickets');
  assert.doesNotMatch(JSON.stringify(captured), /E2E_PRIVATE/);
});
