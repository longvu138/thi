import {httpClient} from './httpClient';
export const receiptsApi={
 get:async(id,signal)=>(await httpClient.get(`/attempts/${id}/receipt`,{signal})).data||null,
 lookup:async code=>(await httpClient.post('/receipts/lookup',{code})).data||null,
};
