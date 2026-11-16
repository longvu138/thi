export const naturalGroups=groups=>[...groups].sort((a,b)=>a.category.localeCompare(b.category,'vi',{numeric:true,sensitivity:'variant'}));
export const applyGroupCount=(groups,k)=>groups.map(g=>({...g,count:k}));
export const moveGroup=(groups,index,direction)=>{const copy=[...groups],next=index+direction;if(next<0||next>=copy.length)return copy;[copy[index],copy[next]]=[copy[next],copy[index]];return copy.map((g,order)=>({...g,order}));};
export const structureTotal=draft=>draft.mode==='RANDOM'?Number(draft.count||0):(draft.groups||[]).reduce((sum,g)=>sum+Number(g.count||0),0);
export const groupErrors=groups=>Object.fromEntries(groups.flatMap(g=>!Number.isInteger(g.count)||g.count<0?[[g.category,'Nhập số nguyên từ 0 trở lên']]:g.count>g.validCount?[[g.category,`Chỉ có ${g.validCount} câu hợp lệ`]]:[]));
export const structurePayload=draft=>draft.mode==='RANDOM'?{mode:'RANDOM',count:draft.count}:{mode:'BY_GROUP',groups:(draft.groups||[]).map((g,order)=>({category:g.category,count:g.count,order}))};
