import {httpClient} from './httpClient';
const path=id=>`/admin/exam-rounds/${id}/structure`;
export const structureApi={get:async id=>(await httpClient.get(path(id))).data,save:async(id,body)=>(await httpClient.put(path(id),body)).data,preview:async(id,body)=>(await httpClient.post(`${path(id)}/preview`,body)).data};
