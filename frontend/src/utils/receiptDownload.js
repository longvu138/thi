export const fitReceiptPage=(width,height)=>{
 if(!(width>0&&height>0))throw new Error('Kích thước phiếu không hợp lệ');
 const scale=Math.min(190/width,277/height);
 return {x:(210-width*scale)/2,y:10,width:width*scale,height:height*scale};
};
export const receiptImage=async(element)=>{
 if(!element)throw new Error('Phiếu chưa sẵn sàng');
 await document.fonts?.ready;
 const {toPng}=await import('html-to-image');
 const width=element.scrollWidth,height=element.scrollHeight;
 const png=await toPng(element,{pixelRatio:2,backgroundColor:'#ffffff',width,height,fontEmbedCSS:'',style:{margin:'0'}});
 return {png,width,height};
};
export const receiptFilename=(code,extension)=>`phieu-ket-qua-${String(code||'').replace(/[^a-z0-9-]/gi,'')}.${extension}`;
export const downloadReceipt=async(element,code)=>{
 const [{png,width,height},{jsPDF}]=await Promise.all([receiptImage(element),import('jspdf')]);
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const box=fitReceiptPage(width,height);
 pdf.addImage(png,'PNG',box.x,box.y,box.width,box.height,undefined,'FAST');
 pdf.save(receiptFilename(code,'pdf'));
};
