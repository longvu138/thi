import {createPortal} from 'react-dom';
import './round-qr-print.css';
import {useRef,useState} from 'react';
import {Alert,Button,Input,QRCode,Space,Typography} from 'antd';
import {FormModal} from '../common/FormModal';
import {buildRoundJoinUrl,isLocalRoundJoinUrl} from '../../utils/examRounds';

export const RoundQrModal=({round=null,onClose})=>{
 const qrRef=useRef(null);
 const download=()=>{const canvas=qrRef.current?.querySelector('canvas');if(!canvas)return;const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=`qr-${round.id}.png`;document.body.appendChild(link);link.click();link.remove();};
 const [origin,setOrigin]=useState(()=>import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin);
 const url=buildRoundJoinUrl(origin,round?.id);
 return <FormModal title="Quét mã để mở trên điện thoại" open={Boolean(round)} width={480} onCancel={onClose} footer={<Space wrap><Button disabled={!url} onClick={download}>Tải ảnh QR</Button><Button disabled={!url} onClick={()=>window.print()}>In mã QR</Button><Button onClick={onClose}>Đóng</Button></Space>}>
  <Space orientation="vertical" size={16} className="full-width">
   <Typography.Text strong style={{overflowWrap:'anywhere'}}>{round?.title}</Typography.Text>
   <Typography.Paragraph style={{margin:0}}>Dùng camera điện thoại quét mã. Nhập thông tin người dự thi để mở đúng đợt kiểm tra này.</Typography.Paragraph>
   {url && <div ref={qrRef} style={{display:'flex',justifyContent:'center'}}><QRCode type="canvas" value={url} size={240} color="#000000" bgColor="#ffffff" marginSize={4}/></div>}
   <div><Typography.Text>Địa chỉ website truy cập từ điện thoại</Typography.Text><Input aria-label="Địa chỉ website truy cập từ điện thoại" value={origin} onChange={event=>setOrigin(event.target.value)} placeholder="https://kiemtra.example.vn" status={!url&&round?'error':undefined}/></div>
   {!url&&round&&<Alert type="error" showIcon title="Nhập địa chỉ website hợp lệ, bắt đầu bằng http:// hoặc https://"/>}
   {isLocalRoundJoinUrl(url)&&<Alert type="info" showIcon title="Điện thoại không truy cập được địa chỉ localhost" description="Nhập tên miền hoặc địa chỉ IP mạng nội bộ của website. Khi dùng IP nội bộ, điện thoại và máy chủ cần cùng mạng Wi-Fi."/>}
   {url&&<Typography.Paragraph copyable={{text:url}} style={{overflowWrap:'anywhere',margin:0}}><a href={url} target="_blank" rel="noreferrer">{url}</a></Typography.Paragraph>}
   {round&&url&&createPortal(<div className="round-qr-print-root"><h1>{round.title}</h1><QRCode type="canvas" value={url} size={280} color="#000000" bgColor="#ffffff" marginSize={4}/><p>Quét mã để vào cổng dự thi</p><p>{url}</p></div>,document.body)}
  </Space>
 </FormModal>;
};
