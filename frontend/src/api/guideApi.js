import {httpClient} from './httpClient';
export const guideApi={
 get:async()=>{const {data}=await httpClient.get('/public/guide');return data;},
 save:async body=>{const {data}=await httpClient.put('/admin/guide',body);return data;},
};
