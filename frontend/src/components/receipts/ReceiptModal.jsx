import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Alert,Button,Space,Spin,Typography} from 'antd';
import {FormModal} from '../common/FormModal';
import {QueryErrorState} from '../common/QueryErrorState';
import {ReceiptSheet} from './ReceiptSheet';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {useAttemptReceipt} from '../../hooks/useReceipts';
import {downloadReceipt,receiptImage,receiptFilename} from '../../utils/receiptDownload';
import {isInAppBrowser,receiptActions,receiptPreviewScale} from '../../utils/receiptPresentation';
import './receipt.css';
const ReceiptContent=({receipt,admin})=>{
 const mobile=useMediaQuery('(max-width:767.98px)');const inApp=isInAppBrowser(navigator.userAgent);
 const actions=receiptActions({mobile,inApp,admin});
 const viewport=useRef(null),sheet=useRef(null),alive=useRef(true);
 const [size,setSize]=useState({scale:1,height:0,printScale:1}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[image,setImage]=useState('');
 useEffect(()=>{
  alive.current=true;
  const measure=()=>{
   const node=sheet.current?.querySelector('.receipt-sheet');if(!node||!viewport.current)return;
   setSize(receiptPreviewScale(viewport.current.clientWidth,node.scrollWidth,node.scrollHeight));
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(viewport.current);observer.observe(sheet.current);
  document.fonts?.ready.then(()=>{if(alive.current)measure();});
  return()=>{alive.current=false;observer.disconnect();};
 },[]);
 const act=async action=>{
  if(busy)return;setBusy(action);setError('');
  try{
   const node=sheet.current?.querySelector('.receipt-sheet');
   if(action==='pdf')await downloadReceipt(node,receipt.verificationCode);
   else if(action==='image'){const data=await receiptImage(node);if(alive.current)setImage(data.png);}
   else {await document.fonts?.ready;if(alive.current)window.print();}
  }catch{if(alive.current)setError(action==='pdf'&&!admin?'Chưa tải được PDF. Hãy thử Lưu ảnh phiếu.':action==='image'?'Chưa tạo được ảnh phiếu. Vui lòng thử lại.':'Chưa thể in hoặc tải phiếu. Vui lòng thử lại.');}
  finally{if(alive.current)setBusy('');}
 };
 const labels={print:'In phiếu',image:'Lưu ảnh phiếu',pdf:'Tải PDF'};
 return <Space orientation="vertical" size={16} className="full-width">
  {inApp&&!admin&&<Alert type="info" showIcon title="Muốn in hoặc tải PDF, mở bằng Chrome/Safari"/>}
  <Space wrap>{actions.map((action,index)=><Button key={action} type={index===0?'primary':'default'} loading={busy===action} disabled={Boolean(busy)&&busy!==action} onClick={()=>act(action)}>{labels[action]}</Button>)}{error&&!admin&&!actions.includes('image')&&<Button onClick={()=>act('image')} disabled={Boolean(busy)}>Lưu ảnh phiếu</Button>}</Space>
  {error&&<Alert type="warning" showIcon title={error}/>}
  {image&&<div className="receipt-saved-image"><Typography.Paragraph>Nhấn giữ ảnh bên dưới để lưu phiếu vào máy.</Typography.Paragraph><img src={image} alt="Ảnh phiếu kết quả để lưu về máy"/>{'download' in document.createElement('a')&&<a href={image} download={receiptFilename(receipt.verificationCode,'png')}><Button>Tải ảnh PNG</Button></a>}</div>}
  <div className="receipt-modal-preview" ref={viewport} aria-label="Xem trước phiếu kết quả"><div style={{height:size.height||undefined,overflow:'hidden'}}><div ref={sheet} className="receipt-preview-canvas" style={{transform:`scale(${size.scale})`}}><ReceiptSheet receipt={receipt}/></div></div></div>
  {createPortal(<div className="receipt-print-root"><div className="receipt-print-page"><div style={{transform:`scale(${size.printScale})`,transformOrigin:'top left',marginLeft:`${210*(1-size.printScale)/2}mm`}}><ReceiptSheet receipt={receipt}/></div></div></div>,document.body)}
 </Space>;
};
export const ReceiptModal=({open=false,onClose,receipt,admin=false,loading=false,error,onRetry})=><FormModal title="Phiếu kết quả" open={open} onCancel={onClose} width={900} footer={<Button onClick={onClose}>Đóng</Button>}>
 {open&&<>{error?<QueryErrorState error={error} onRetry={onRetry}/>:!receipt?<Spin tip="Đang tải phiếu…"><div style={{minHeight:100}}/></Spin>:<ReceiptContent key={receipt.verificationCode} receipt={receipt} admin={admin}/>}{loading&&receipt&&<Typography.Text type="secondary">Đang cập nhật phiếu…</Typography.Text>}</>}
</FormModal>;
export const AttemptReceiptModal=({attemptId,open=false,onClose,admin=false})=>{
 const query=useAttemptReceipt(open?attemptId:null,admin);
 return <ReceiptModal open={open} onClose={onClose} receipt={query.data} admin={admin} loading={query.isFetching} error={query.isError?query.error:null} onRetry={()=>query.refetch()}/>;
};
