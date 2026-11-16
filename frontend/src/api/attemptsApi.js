import {httpClient,getCsrfToken} from './httpClient';
import {attemptReceipt} from '../utils/attempts';
const timed = async request => {
 const started=performance.now();const {data}=await request();const received=performance.now();
 if(!data?.id || !['IN_PROGRESS','SUBMITTED','EXPIRED'].includes(data.status))throw new Error('Phản hồi lượt thi không hợp lệ');
 if(data.status==='IN_PROGRESS' && (!Array.isArray(data.questions) || !data.questions.length || !Number.isFinite(Date.parse(data.serverTime)) || !Number.isFinite(Date.parse(data.expiresAt))))throw new Error('Phản hồi đề thi hoặc thời gian không hợp lệ');
 return attemptReceipt(data,started,received);
};
export const attemptsApi = {
 start:id=>timed(()=>httpClient.post(`/exam-rounds/${id}/start`,{},{timeout:30000})),
 get:(id,signal)=>timed(()=>httpClient.get(`/attempts/${id}`,{signal,timeout:30000})),
 save:async({id,body,keepalive=false})=>{
  if(!keepalive)return httpClient.put(`/attempts/${id}/answers`,body,{timeout:30000});
  const url=`${httpClient.defaults.baseURL.replace(/\/$/,'')}/attempts/${id}/answers`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
  try{const response=await fetch(url,{method:'PUT',credentials:'include',keepalive:true,signal:controller.signal,headers:{'Content-Type':'application/json','X-CSRF-Token':getCsrfToken()||''},body:JSON.stringify(body)});
  if(!response.ok)throw Object.assign(new Error('Chưa đồng bộ'),{response:{status:response.status}});
  return response;
  }finally{clearTimeout(timer);}
 },
 submit:({id,body})=>timed(()=>httpClient.post(`/attempts/${id}/submit`,body,{timeout:60000})),
};
