import {safeSessionStorage,safeLocalStorage} from './safeStorage.js';
const PREFIX='exam-attempt:';
const validChoice=value=>value===null||['A','B','C','D'].includes(value);
export const attemptStorageKey=id=>`${PREFIX}${id}`;
export const readDraft=(id,storage=safeSessionStorage,now=Date.now())=>{
 const key=attemptStorageKey(id);const data=storage.getJSON(key,null);
 if(!data||!Number.isFinite(data.deadline)||data.deadline<=now||!data.answers||!data.modifiedAt){storage.removeItem(key);return null;}
 const answers={},modifiedAt={};for(const [q,value] of Object.entries(data.answers))if(validChoice(value)&&Number.isFinite(data.modifiedAt[q])){answers[q]=value;modifiedAt[q]=data.modifiedAt[q];}
 return {answers,modifiedAt,deadline:data.deadline};
};
export const writeDraft=(id,answers,modifiedAt,deadline,storage=safeSessionStorage)=>storage.setJSON(attemptStorageKey(id),{answers,modifiedAt,deadline});
export const clearDraft=(id,storage=safeSessionStorage)=>{storage.removeItem(attemptStorageKey(id));storage.removeItem(`${PREFIX}position:${id}`);};
export const clearAttemptDrafts=(storage=globalThis.window?.sessionStorage)=>{
 try{for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(PREFIX))storage.removeItem(key);}}catch{return false;}return true;
};
export const getPosition=(id,storage=safeSessionStorage)=>Math.max(0,Number(storage.getItem(`${PREFIX}position:${id}`,0))||0);
export const setPosition=(id,value,storage=safeSessionStorage)=>storage.setItem(`${PREFIX}position:${id}`,value);
export const getAutoAdvance=(mobile,storage=safeLocalStorage)=>{const value=storage.getItem('exam-auto-advance');return value===null?mobile:value==='true';};
export const setAutoAdvance=(value,storage=safeLocalStorage)=>storage.setItem('exam-auto-advance',String(value));
export const mergeDraft=(attempt,draft)=>{
 const selected={},pending={};
 for(const q of attempt.questions){selected[q.id]=q.selectedAnswer;const local=draft?.answers?.[q.id];
  if(Object.hasOwn(draft?.answers||{},q.id)&&validChoice(local)&&(draft.modifiedAt[q.id]||0)>(Date.parse(q.answerUpdatedAt)||0))selected[q.id]=local;
  if(selected[q.id]!==q.selectedAnswer)pending[q.id]=selected[q.id];
 }
 return {selected,pending};
};
