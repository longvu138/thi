const { httpError } = require('../../utils/http-error');
const { toIsoUtc } = require('../../utils/datetime');
const { requireFields } = require('../../utils/validation');
const STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];
const DEFAULTS = {
  description: null, passingPercentage: 70, stopAfterPass: false,
  showCorrectAnswers: true, shuffleQuestions: true, shuffleOptions: true,
  trialStartAt: null, startAt: null, endAt: null, status: 'DRAFT',
};
const FIELDS = ['title', 'durationMinutes', 'maxAttempts', ...Object.keys(DEFAULTS)];
const validateId = id => {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw httpError(422, 'Mã định danh không hợp lệ');
  }
  return id;
};
const parseTime = (value, label) => {
  if (value === null) return null;
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match) throw httpError(422, `${label} phải là thời gian ISO có múi giờ`);
  const [, year, month, day, hour, minute, second = '0', , offsetHour = '0', offsetMinute = '0'] = match;
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number(year) < 1000 || calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day)
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour) > 14 || Number(offsetMinute) > 59 || (Number(offsetHour) === 14 && Number(offsetMinute) !== 0)
    || !Number.isFinite(Date.parse(value))) throw httpError(422, `${label} không hợp lệ`);
  const normalized = toIsoUtc(value);
  if (Number(normalized.slice(0, 4)) < 1000 || Number(normalized.slice(0, 4)) > 9999) throw httpError(422, `${label} ngoài phạm vi cho phép`);
  return normalized;
};
const validateRound = (body, { partial = false } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(422, 'Dữ liệu đợt kiểm tra không hợp lệ');
  if (Object.keys(body).some(key => !FIELDS.includes(key))) throw httpError(422, 'Trường dữ liệu đợt kiểm tra không hợp lệ');
  if (partial && !Object.keys(body).length) throw httpError(422, 'Vui lòng cung cấp thông tin cần sửa');
  const data = partial ? { ...body } : { ...DEFAULTS, ...body };
  if (!partial) {
    const missing = requireFields(data, { title: 'Tên đợt kiểm tra', durationMinutes: 'Thời lượng', maxAttempts: 'Số lượt tối đa' });
    if (missing) throw httpError(422, missing.error);
  }
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 255) throw httpError(422, 'Tên đợt kiểm tra phải có từ 1 đến 255 ký tự');
    data.title = data.title.trim();
  }
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string' || data.description.length > 15000) throw httpError(422, 'Mô tả không được quá 15000 ký tự');
    data.description = data.description.trim() || null;
  }
  for (const [key, label] of [['durationMinutes', 'Thời lượng'], ['maxAttempts', 'Số lượt tối đa']]) {
    if (data[key] !== undefined && (!Number.isInteger(data[key]) || data[key] < 1 || data[key] > 2147483647)) throw httpError(422, `${label} phải là số nguyên dương không quá 2147483647`);
  }
  if (data.passingPercentage !== undefined && (!Number.isInteger(data.passingPercentage) || data.passingPercentage < 0 || data.passingPercentage > 100)) throw httpError(422, 'Ngưỡng đạt phải là số nguyên từ 0 đến 100');
  for (const key of ['stopAfterPass', 'showCorrectAnswers', 'shuffleQuestions', 'shuffleOptions']) {
    if (data[key] !== undefined && typeof data[key] !== 'boolean') throw httpError(422, 'Các tùy chọn đợt kiểm tra phải là true hoặc false');
  }
  if (data.status !== undefined && !STATUSES.includes(data.status)) throw httpError(422, 'Trạng thái đợt kiểm tra không hợp lệ');
  if (data.trialStartAt !== undefined) data.trialStartAt = parseTime(data.trialStartAt, 'Thời gian chạy thử');
  if (data.startAt !== undefined) data.startAt = parseTime(data.startAt, 'Thời gian bắt đầu');
  if (data.endAt !== undefined) data.endAt = parseTime(data.endAt, 'Thời gian kết thúc');
  if (data.startAt && data.endAt && data.startAt >= data.endAt) throw httpError(422, 'Thời gian kết thúc phải sau thời gian bắt đầu');
  if (!partial && data.trialStartAt && (!data.startAt || data.trialStartAt >= data.startAt)) throw httpError(422, 'Thời gian chạy thử phải trước thời gian bắt đầu chính thức');
  return data;
};
const validateQuery = (query = {}) => {
  if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 255)) throw httpError(422, 'Từ khóa tìm kiếm không hợp lệ');
  if (query.status !== undefined && !STATUSES.includes(query.status)) throw httpError(422, 'Trạng thái lọc không hợp lệ');
  return query;
};
module.exports = { DEFAULTS, FIELDS, STATUSES, validateRound, validateId, validateQuery };
