import {isNetworkFailure,syncDeadline} from './attempts.js';
import {readDraft,writeDraft,clearDraft,mergeDraft} from './attemptStorage.js';
export const createAttemptSession=({save,submit,load,id,now=Date.now,storage,wait=ms=>new Promise(r=>setTimeout(r,ms))})=>{
 const listeners=new Set(),pending=new Map();let revision=0,saving=null,submitting=null,paused=false,modifiedAt={},clockOffset=0;
 let snapshot={attempt:null,selected:{},pendingCount:0,saving:false,submitting:false,error:null,submitError:null,unrecordedCount:0,deadline:0};
 const update=changes=>{snapshot={...snapshot,...changes,pendingCount:pending.size};for(const listener of listeners)listener();};
 const persist=()=>{if(paused)return;const a=snapshot.attempt;if(!a)return;if(a.status!=='IN_PROGRESS'||Date.parse(a.expiresAt)<=now()+clockOffset)clearDraft(a.id,storage);else writeDraft(a.id,snapshot.selected,modifiedAt,Date.parse(a.expiresAt)-clockOffset,storage);};
 const reconcile=receipt=>{
  const attempt=receipt?.attempt;if(!attempt?.id||(snapshot.attempt&&snapshot.attempt.id!==attempt.id))return;
  if(snapshot.attempt&&snapshot.attempt.status!=='IN_PROGRESS'&&attempt.status==='IN_PROGRESS')return;
  const closed=attempt.status!=='IN_PROGRESS';clockOffset=(Date.parse(attempt.serverTime)||now())-now();
  const first=!snapshot.attempt,draft=closed?null:first?readDraft(attempt.id,storage,now()):{answers:snapshot.selected,modifiedAt,deadline:0};
  if(draft)modifiedAt=Object.fromEntries(attempt.questions.filter(q=>Number.isFinite(draft.modifiedAt[q.id])).map(q=>[q.id,draft.modifiedAt[q.id]]));
  const merged=mergeDraft(attempt,draft);let selected=merged.selected;
  // Trong phiên đang mở, lựa chọn do người dùng sửa là nguồn chính.
  // updated_at là thời điểm server ghi, không phải thời điểm người dùng chọn;
  // phản hồi GET chậm không được dùng timestamp đó để ghi đè lựa chọn mới.
  if(!first&&!closed)for(const q of attempt.questions)if(Object.hasOwn(modifiedAt,q.id)){
   selected[q.id]=snapshot.selected[q.id];
   if(selected[q.id]!==q.selectedAnswer)merged.pending[q.id]=selected[q.id];
   else delete merged.pending[q.id];
  }
  if(!closed)for(const [q,answer]of Object.entries(merged.pending))if(!pending.has(q))pending.set(q,{answer,revision:++revision});
  if(!first&&!closed)for(const [q,value]of pending){
   const server=attempt.questions.find(item=>item.id===q);
   if(!saving&&!submitting&&server?.selectedAnswer===value.answer)pending.delete(q);else selected[q]=value.answer;
  }
  const lost=closed?[...pending].filter(([q,value])=>selected[q]!==value.answer).length:0;
  if(closed)pending.clear();
  update({attempt,selected,deadline:syncDeadline(snapshot.deadline,receipt.deadline),unrecordedCount:Math.max(snapshot.unrecordedCount,lost),...(closed?{error:null,submitError:null}:{})});persist();
 };
 const resolveClosed=async error=>{if(paused||error?.response?.status!==409)return false;const receipt=await load();reconcile(receipt);return receipt.attempt.status!=='IN_PROGRESS';};
 const acknowledge=batch=>{for(const [q,value]of batch)if(pending.get(q)?.revision===value.revision)pending.delete(q);update({error:null});persist();};
 const flush=(keepalive=false)=>{
  if(keepalive&&saving)return saving.then(()=>flush(true));
  if(paused||submitting||saving||!pending.size||snapshot.attempt?.status!=='IN_PROGRESS')return saving||Promise.resolve();
  const entries=[...pending];update({saving:true});
  saving=(async()=>{try{for(let i=0;i<entries.length;i+=500){const batch=entries.slice(i,i+500);await save({answers:batch.map(([attemptQuestionId,v])=>({attemptQuestionId,selectedAnswer:v.answer}))},{keepalive});acknowledge(batch);}}
   catch(error){try{if(await resolveClosed(error))return;}catch(statusError){update({error:statusError});}update({error});}
   finally{saving=null;update({saving:false});}})();return saving;
 };
 const choose=(q,answer)=>{
  if(paused||snapshot.submitting||snapshot.attempt?.status!=='IN_PROGRESS')return;
  const question=snapshot.attempt.questions.find(item=>item.id===q);if(!question||(answer!==null&&!question.options.some(o=>o.key===answer)))return;
  pending.set(q,{answer,revision:++revision});modifiedAt[q]=now()+clockOffset;
  update({selected:{...snapshot.selected,[q]:answer},error:null,submitError:null});persist();
 };
 const finish=()=>{
  if(paused||snapshot.attempt?.status!=='IN_PROGRESS')return Promise.resolve();if(submitting)return submitting;
  const body={answers:snapshot.attempt.questions.map(q=>({attemptQuestionId:q.id,selectedAnswer:snapshot.selected[q.id]??null}))};
  update({submitting:true,submitError:null});
  submitting=(async()=>{try{for(let index=0;index<3;index++){try{if(paused)return;reconcile(await submit(body));return;}catch(error){
   try{if(await resolveClosed(error))return;}catch(statusError){update({error:statusError});}
   if(paused)return;if(index===2||!isNetworkFailure(error)){update({submitError:error});throw error;}await wait(1000*2**index);
  }}}finally{submitting=null;update({submitting:false});}})();return submitting;
 };
 return {pause:()=>{paused=true;},resume:()=>{paused=false;},getSnapshot:()=>snapshot,subscribe:l=>{listeners.add(l);return()=>listeners.delete(l);},reconcile,choose,flush,finish,expireStorage:()=>clearDraft(id||snapshot.attempt?.id,storage)};
};
