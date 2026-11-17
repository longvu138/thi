import {httpClient} from './httpClient';
export const receiptsApi={
 adminList:async params=>(await httpClient.get('/admin/receipts',{params})).data,
 adminGet:async(id,signal)=>(await httpClient.get(`/admin/receipts/${id}`,{signal})).data,
 get:async(id,signal)=>(await httpClient.get(`/attempts/${id}/receipt`,{signal})).data||null,
 lookup:async code=>(await httpClient.post('/receipts/lookup',{code})).data||null,
};
