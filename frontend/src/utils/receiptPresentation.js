export const isInAppBrowser=(userAgent='')=>/Zalo|FBAN|FBAV|FB_IAB|Messenger|\bInstagram\b/i.test(userAgent);
export const receiptActions=({mobile=false,inApp=false,admin=false}={})=>admin?['print','pdf']:mobile||inApp?['image','pdf']:['print','pdf'];
export const legacyReceiptTarget=id=>({pathname:`/attempts/${id}/result`,state:{openReceipt:true},replace:true});
export const receiptPreviewScale=(availableWidth,sheetWidth,sheetHeight)=>{
 const scale=Math.min(1,Math.max(0,availableWidth)/sheetWidth);
 return {scale,height:sheetHeight*scale,printScale:Math.min(1,(297/210)*sheetWidth/sheetHeight)};
};
