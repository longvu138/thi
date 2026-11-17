export const RECEIPT_CODES_KEY='savedReceiptCodes';
export const parseReceiptCodes=value=>{
 try{const data=JSON.parse(value||'[]');return Array.isArray(data)?[...new Set(data.filter(code=>typeof code==='string'&&/^(?:[A-Z0-9]{6}|(?:[0-9A-F]{4}-){4}[0-9A-F]{4})$/.test(code)))].slice(0,10):[];}catch{return [];}
};
export const rememberReceiptCode=(stored,code)=>parseReceiptCodes(JSON.stringify([code,...parseReceiptCodes(stored)]));
export const receiptDate=iso=>{
 const date=new Date(iso);if(!Number.isFinite(date.getTime()))return {date:'',time:'',day:'',month:'',year:''};
 const parts=Object.fromEntries(new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part=>[part.type,part.value]));
 return {...parts,date:`${parts.day}/${parts.month}/${parts.year}`,time:`${parts.hour}:${parts.minute}`};
};
