const { httpError } = require('../../utils/http-error');
const { validateId } = require('../attempts/attempts.validator');
const { parsePagination } = require('../../utils/pagination');
const validate = (id, query = {}) => {
 validateId(id);
 const allowed = ['page','limit','search','partyCommittee','partyBranch','result','isTrial','sort','order','committeeKey'];
 if (Object.keys(query).some(key=>!allowed.includes(key))) throw httpError(422,'Bộ lọc báo cáo không hợp lệ');
 if(query.committeeKey!==undefined&&!/^[0-9a-f]{64}$/.test(query.committeeKey))throw httpError(422,'Mã nhóm đảng bộ không hợp lệ');
 const filters = {committeeKey:query.committeeKey||''};
 for (const key of ['search','partyCommittee','partyBranch']) {
  if (query[key] !== undefined && (typeof query[key] !== 'string' || query[key].length > 255)) throw httpError(422,'Nội dung lọc không quá 255 ký tự');
  filters[key] = query[key]?.trim() || '';
 }
 if (query.result !== undefined && !['PASSED','FAILED','IN_PROGRESS_ROUND','NOT_STARTED'].includes(query.result)) throw httpError(422,'Kết quả cuối không hợp lệ');
 if (query.isTrial !== undefined && !['true','false'].includes(query.isTrial)) throw httpError(422,'Bộ lọc chạy thử phải là true hoặc false');
 if (query.sort !== undefined && !['correctRate','encounterCount'].includes(query.sort)) throw httpError(422,'Cột sắp xếp không hợp lệ');
 if (query.order !== undefined && !['asc','desc'].includes(query.order)) throw httpError(422,'Thứ tự sắp xếp không hợp lệ');
 return {...filters,result:query.result || '',isTrial:query.isTrial==='true',sort:query.sort || 'correctRate',order:query.order || 'asc',pagination:parsePagination(query)};
};
module.exports = { validate };
