import { httpClient } from './httpClient';
import { normalizeResult, normalizeResults } from '../utils/results';
export const resultsApi = {
 get: async (id, signal) => normalizeResult((await httpClient.get(`/attempts/${id}/result`, { signal,timeout:30000 })).data),
 list: async (params, signal) => normalizeResults((await httpClient.get('/my-results', { params, signal })).data),
};
