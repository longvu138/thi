import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link,useParams} from 'react-router-dom';
import {Alert,Button,Card,Form,Input,Space,Spin,Typography} from 'antd';
import {useAttemptReceipt,useReceiptLookup} from '../../hooks/useReceipts';
import {ReceiptSheet} from '../../components/receipts/ReceiptSheet';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {safeLocalStorage} from '../../utils/safeStorage';
import {parseReceiptCodes,rememberReceiptCode,RECEIPT_CODES_KEY} from '../../utils/receipts';
import {getApiErrorMessage} from '../../utils/apiError';
export const ReceiptPage=()=>{
 const {id}=useParams();const query=useAttemptReceipt(id);const lookup=useReceiptLookup();
 const [form]=Form.useForm();const [saved,setSaved]=useState(()=>parseReceiptCodes(safeLocalStorage.getItem(RECEIPT_CODES_KEY)));
 const receipt=id?query.data:lookup.data;
 useEffect(()=>{
  if(!receipt?.verificationCode)return;
  const codes=rememberReceiptCode(safeLocalStorage.getItem(RECEIPT_CODES_KEY),receipt.verificationCode);
  safeLocalStorage.setItem(RECEIPT_CODES_KEY,JSON.stringify(codes));
 },[receipt?.verificationCode]);
 const content=<Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card"><Typography.Title level={4} style={{marginTop:0}}>Phiếu kết quả kiểm tra</Typography.Title>
   {!id&&<><Form form={form} layout="vertical" onFinish={({code})=>lookup.mutate(code)}><Form.Item name="code" label="Mã xác nhận / tra cứu" rules={[{required:true,whitespace:true,message:'Vui lòng nhập mã trên phiếu'}]}><Input placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" maxLength={80} autoComplete="off"/></Form.Item><Button type="primary" htmlType="submit" loading={lookup.isPending}>Tra cứu phiếu</Button></Form>
    {saved.length>0&&<div style={{marginTop:16}}><Typography.Paragraph>Mã đã lưu trên trình duyệt này:</Typography.Paragraph><Space wrap>{saved.map(code=><Button key={code} onClick={()=>form.setFieldValue('code',code)}>{code}</Button>)}<Button danger onClick={()=>{safeLocalStorage.removeItem(RECEIPT_CODES_KEY);setSaved([]);}}>Xóa mã đã lưu trên máy</Button></Space></div>}
   </>}
   <Space wrap style={{marginTop:16}}><Link to="/login">Về cổng dự thi</Link>{id&&<Link to={`/attempts/${id}/result`}>Về kết quả lượt thi</Link>}</Space>
  </Card>
  {id&&query.isError&&<QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>}
  {!id&&lookup.isError&&<Alert type="error" showIcon title={getApiErrorMessage(lookup.error)}/>}
  {(query.isFetching||lookup.isPending)&&<Spin/>}
  {receipt&&<><Card className="glass-card"><Alert type="success" showIcon title={<span>Mã tra cứu: <Typography.Text copyable>{receipt.verificationCode}</Typography.Text></span>} description="Giữ mã để tìm và in lại phiếu khi không còn phiên đăng nhập. Ai có mã này có thể xem phiếu; mã được lưu trên trình duyệt này, không lưu điểm hay thông tin cá nhân."/><Space wrap style={{marginTop:16}}><Button type="primary" onClick={()=>window.print()}>In phiếu / Lưu PDF</Button><Link to="/receipts"><Button>Tra cứu bằng mã</Button></Link></Space><Typography.Paragraph type="secondary" style={{marginTop:12,marginBottom:0}}>Khi in, chọn khổ A4 và bỏ chọn “Đầu trang và chân trang” để phiếu giống mẫu.</Typography.Paragraph></Card><div className="receipt-preview"><ReceiptSheet receipt={receipt}/></div>{createPortal(<div className="receipt-print-root"><ReceiptSheet receipt={receipt}/></div>,document.body)}</>}
 </Space>;
 return id?content:<main style={{maxWidth:960,margin:'0 auto',padding:'24px 16px'}}>{content}</main>;
};
