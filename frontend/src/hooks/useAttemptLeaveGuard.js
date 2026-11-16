import {useEffect} from 'react';
import {useBlocker} from 'react-router-dom';
import {preventAttemptUnload,shouldWarnAttemptLeave} from '../utils/attemptLeave';

export const useAttemptLeaveGuard = (status, submitting = false) => {
 const blocker=useBlocker(shouldWarnAttemptLeave(status));
 useEffect(()=>{
  const beforeUnload=event=>preventAttemptUnload(event,submitting);
  if(!submitting)return;
  window.addEventListener('beforeunload',beforeUnload);
  return()=>window.removeEventListener('beforeunload',beforeUnload);
 },[submitting]);
 return blocker;
};
