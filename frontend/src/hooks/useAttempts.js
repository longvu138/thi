import {startBatchLoop} from '../utils/attemptBatch';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {attemptsApi} from '../api/attemptsApi';
import {createAttemptSession} from '../utils/attemptSession';
import {attemptWarnings,remainingSeconds,resultDestination} from '../utils/attempts';
const key=id=>['attempts','detail',id];
const useAlive=()=>{const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);return alive;};
const subscribeNetwork=callback=>{window.addEventListener('online',callback);window.addEventListener('offline',callback);return()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback);};};
export const useOnline=()=>useSyncExternalStore(subscribeNetwork,()=>navigator.onLine,()=>true);
export const useStartAttempt=()=>{
 const client=useQueryClient();const navigate=useNavigate();const alive=useAlive();
 return useMutation({mutationFn:attemptsApi.start,retry:false,onSuccess:receipt=>{
  if(!alive.current)return;
  client.invalidateQueries({queryKey:['exam-rounds']});client.setQueryData(key(receipt.attempt.id),receipt);navigate(`/attempts/${receipt.attempt.id}`);
 }});
};
export const useAttemptSession=id=>{
 const online=useOnline();const client=useQueryClient();const alive=useAlive();const navigate=useNavigate();
 const query=useQuery({queryKey:key(id),queryFn:({signal})=>attemptsApi.get(id,signal),retry:false,refetchOnWindowFocus:true,refetchInterval:query=>online && query.state.data?.attempt.status==='IN_PROGRESS'?30000:false});
 const {mutateAsync:saveAsync}=useMutation({mutationFn:attemptsApi.save,retry:false,networkMode:'always'});
 const {mutateAsync:submitAsync}=useMutation({mutationFn:attemptsApi.submit,retry:false,networkMode:'always'});
 const session=useMemo(()=>createAttemptSession({
  id,save:(body,{keepalive=false}={})=>saveAsync({id,body,keepalive}),
  submit:async body=>{const receipt=await submitAsync({id,body});if(alive.current)client.setQueryData(key(id),receipt);return receipt;},
  load:async()=>{const receipt=await attemptsApi.get(id);if(alive.current)client.setQueryData(key(id),receipt);return receipt;},
 }),[id,saveAsync,submitAsync,client,alive]);
 const state=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 const [now,setNow]=useState(()=>performance.now());
 const autoSubmitted=useRef(false);const warnings=useRef(new Set());const previousRemaining=useRef(null);const lastOnline=useRef(online);const [reminder,setReminder]=useState(null);
 useEffect(()=>{session.resume();return()=>session.pause();},[session]);
 useEffect(()=>{if(query.data)session.reconcile(query.data);},[query.data,session]);
 useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>startBatchLoop({session,online:()=>online}),[session,online]);
 const remaining=remainingSeconds(state.deadline,now);
 useEffect(()=>{
  if(state.attempt?.status!=='IN_PROGRESS')return;
  for(const threshold of attemptWarnings(previousRemaining.current,remaining,warnings.current)){
   warnings.current.add(threshold);setReminder(`Thời gian làm bài còn${remaining<threshold?' dưới':''} ${threshold/60} phút.`);
  }
  previousRemaining.current=remaining;
  if(remaining===0){session.expireStorage();if(!autoSubmitted.current){autoSubmitted.current=true;session.finish().catch(()=>undefined);}}
 },[remaining,state.attempt?.status,session]);
 useEffect(()=>{
  if(online && !lastOnline.current){
   const current=session.getSnapshot();
   if(current.attempt?.status==='IN_PROGRESS'){
    if(autoSubmitted.current)session.finish().catch(()=>undefined);
    else session.flush().catch(()=>undefined);
   }
  }
  lastOnline.current=online;
 },[online,session]);
 useEffect(()=>{
  const hidden=()=>{if(document.visibilityState==='hidden')session.flush(true);};const pagehide=()=>session.flush(true);
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
  return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);};
 },[session]);
 useEffect(()=>{if(state.attempt&&state.attempt.status!=='IN_PROGRESS')navigate(resultDestination(id),{replace:true,state:{unrecordedCount:state.unrecordedCount}});},[state.attempt,state.unrecordedCount,id,navigate]);
 return {query,state,online,remaining,reminder:remaining<=300?'Thời gian làm bài còn dưới 5 phút':reminder,choose:session.choose,save:session.flush,finish:session.finish};
};
