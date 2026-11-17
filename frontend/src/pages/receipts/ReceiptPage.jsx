import {useState} from 'react';
import {Link,Navigate,useNavigate,useParams} from 'react-router-dom';
import {Alert,Button,Card,Form,Input,Space,Typography} from 'antd';
import {useReceiptLookup} from '../../hooks/useReceipts';
import {AttemptReceiptModal,ReceiptModal} from '../../components/receipts/ReceiptModal';
import {safeLocalStorage} from '../../utils/safeStorage';
import {parseReceiptCodes,rememberReceiptCode,RECEIPT_CODES_KEY} from '../../utils/receipts';
import {legacyReceiptTarget} from '../../utils/receiptPresentation';
import {getApiErrorMessage} from '../../utils/apiError';
export const LegacyReceiptRedirect=()=>{
 const {id}=useParams();const target=legacyReceiptTarget(id);
 return <Navigate to={target.pathname} state={target.state} replace/>;
};
const AdminReceiptPage=()=>{
 const {id}=useParams();const navigate=useNavigate();
 return <AttemptReceiptModal admin attemptId={id} open onClose={()=>navigate('/admin/receipts',{replace:true})}/>;
};
const ReceiptLookupPage=()=>{
 const lookup=useReceiptLookup();const [form]=Form.useForm();
 const [saved,setSaved]=useState(()=>parseReceiptCodes(safeLocalStorage.getItem(RECEIPT_CODES_KEY)));
 const [receipt,setReceipt]=useState(null),[open,setOpen]=useState(false);
 const find=code=>{
  if(lookup.isPending)return;
  setOpen(false);form.setFieldValue('code',code);
  lookup.mutate(code,{onSuccess:data=>{
   const codes=rememberReceiptCode(safeLocalStorage.getItem(RECEIPT_CODES_KEY),data.verificationCode);
   safeLocalStorage.setItem(RECEIPT_CODES_KEY,JSON.stringify(codes));setSaved(codes);setReceipt(data);setOpen(true);
  }});
 };
 return <main className="receipt-lookup-page"><Card className="glass-card"><Space orientation="vertical" size={16} className="full-width">
  <Typography.Title level={4} style={{margin:0}}>Tra cứu phiếu kết quả</Typography.Title>
  <Form form={form} layout="vertical" onFinish={({code})=>find(code)}><Form.Item name="code" label="Mã xác nhận / tra cứu" rules={[{required:true,whitespace:true,message:'Vui lòng nhập mã trên phiếu'}]}><Input placeholder="Ví dụ: AB3K7X" maxLength={80} autoComplete="off"/></Form.Item><Button type="primary" htmlType="submit" loading={lookup.isPending}>Tra cứu phiếu</Button></Form>
  {saved.length>0&&<><Typography.Text type="secondary">Mã đã lưu trên trình duyệt này:</Typography.Text><Space wrap>{saved.map(code=><Button key={code} disabled={lookup.isPending} onClick={()=>find(code)}>{code}</Button>)}<Button danger onClick={()=>{safeLocalStorage.removeItem(RECEIPT_CODES_KEY);setSaved([]);}}>Xóa mã đã lưu trên máy</Button></Space></>}
  {lookup.isError&&<Alert type="error" showIcon title={getApiErrorMessage(lookup.error)}/>}
  <Link to="/">Về cổng dự thi</Link>
 </Space></Card><ReceiptModal open={open} onClose={()=>setOpen(false)} receipt={receipt}/></main>;
};
export const ReceiptPage=({admin=false})=>admin?<AdminReceiptPage/>:<ReceiptLookupPage/>;
