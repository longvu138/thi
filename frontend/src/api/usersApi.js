import { httpClient } from './httpClient';
import { normalizeUsers, normalizeUserPreview } from '../utils/users';
export const usersApi = {
 template:async ()=>(await httpClient.get('/admin/users/template',{responseType:'blob'})).data,
 import:async ({file,mode,previewToken})=>{
  const data=new FormData();data.append('mode',mode);data.append('file',file);if(previewToken)data.append('previewToken',previewToken);
  const response=await httpClient.post('/admin/users/import',data,{timeout:60000});return mode==='preview'?normalizeUserPreview(response.data):response.data;
 },
 list: async params => normalizeUsers((await httpClient.get('/admin/users',{params})).data),
 create: async body => (await httpClient.post('/admin/users',body)).data,
 update: async ({id,body}) => (await httpClient.patch(`/admin/users/${id}`,body)).data,
 remove: async id => httpClient.delete(`/admin/users/${id}`),
};
