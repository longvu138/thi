import {httpClient} from './httpClient';
import {normalizeQuestionList,normalizePreview} from '../utils/questions';
const path=roundId=>`/admin/exam-rounds/${roundId}/questions`;
export const questionsApi = {
 list:async (roundId,params)=>normalizeQuestionList((await httpClient.get(path(roundId),{params})).data),
 categories:async (roundId,params)=>normalizeQuestionList((await httpClient.get(`${path(roundId)}/categories`,{params})).data),
 create:async (roundId,body)=>(await httpClient.post(path(roundId),body)).data,
 update:async (roundId,{id,body})=>(await httpClient.patch(`${path(roundId)}/${id}`,body)).data,
 remove:async (roundId,id)=>httpClient.delete(`${path(roundId)}/${id}`),
 template:async ()=>(await httpClient.get('/admin/questions/template',{responseType:'blob'})).data,
 export:async roundId=>(await httpClient.get(`${path(roundId)}/export`,{responseType:'blob'})).data,
 import:async (roundId,{file,mode,previewToken})=>{
  const data=new FormData();data.append('mode',mode);data.append('file',file);if(previewToken)data.append('previewToken',previewToken);
  const response=await httpClient.post(`${path(roundId)}/import`,data,{timeout:60000});
  return mode==='preview'?normalizePreview(response.data):response.data;
 },
};
