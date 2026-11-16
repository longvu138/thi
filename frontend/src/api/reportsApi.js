import { httpClient } from './httpClient';
import { normalizeReport } from '../utils/reports';
const path=id=>`/admin/exam-rounds/${id}`;
export const reportsApi={
 committees:async(id,params,signal)=>normalizeReport((await httpClient.get(`${path(id)}/committee-statistics`,{params,signal})).data),
 results:async(id,params,signal)=>normalizeReport((await httpClient.get(`${path(id)}/results`,{params,signal})).data),
 questions:async(id,params,signal)=>normalizeReport((await httpClient.get(`${path(id)}/question-statistics`,{params,signal})).data),
 export:async(id,params)=>{try{return(await httpClient.get(`${path(id)}/export`,{params,responseType:'blob',timeout:120000})).data;}catch(error){if(error.response?.data instanceof Blob){try{error.response.data=JSON.parse(await error.response.data.text());}catch{error.message='Không tải được báo cáo Excel, vui lòng thử lại';}}throw error;}},
 clearTrial:async id=>(await httpClient.delete(`${path(id)}/trial-data`,{data:{confirm:true}})).data,
};

export const adminAttemptsApi={
 history:async(roundId,userId,params,signal)=>normalizeReport((await httpClient.get(`/admin/exam-rounds/${roundId}/participants/${userId}/attempts`,{params,signal})).data),
 get:async(id,signal)=>{
  const {normalizeResult}=await import('../utils/results');return normalizeResult((await httpClient.get(`/admin/attempts/${id}`,{signal})).data,{admin:true});
 },
};
