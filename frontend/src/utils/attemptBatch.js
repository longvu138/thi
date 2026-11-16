import {BATCH_INTERVAL_MS} from './attempts.js';
export const startBatchLoop=({session,online=()=>true,schedule=setInterval,cancel=clearInterval})=>{
 const timer=schedule(()=>{const state=session.getSnapshot();if(online()&&state.pendingCount&&!state.submitting)session.flush();},BATCH_INTERVAL_MS);
 return()=>cancel(timer);
};
