import { httpClient } from './httpClient';
import { normalizeRound, normalizeRoundList } from '../utils/examRounds';
const path = admin => admin ? '/admin/exam-rounds' : '/exam-rounds';
export const examRoundsApi = {
 publicList: async params => normalizeRoundList((await httpClient.get('/public/exam-rounds', {params})).data),
 list: async ({ admin, params }) => normalizeRoundList((await httpClient.get(path(admin), { params })).data),
 get: async ({ admin, id }) => normalizeRound((await httpClient.get(`${path(admin)}/${id}`)).data),
 create: async body => normalizeRound((await httpClient.post(path(true), body)).data),
 update: async ({ id, body }) => normalizeRound((await httpClient.patch(`${path(true)}/${id}`, body)).data),
 remove: async id => httpClient.delete(`${path(true)}/${id}`),
};
