import {Button,QRCode,Space,Typography} from 'antd';
import {FormModal} from '../common/FormModal';
export const WebsiteQrModal=({open,onClose})=>{
 const url=new URL('/login',import.meta.env.VITE_PUBLIC_APP_URL||window.location.origin).href;
 return <FormModal title="Truy cập website trên điện thoại" open={open} width={440} onCancel={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
  <Space orientation="vertical" size={16} className="full-width">
   <Typography.Paragraph>Quét mã QR để mở cổng kiểm tra, chọn đợt và nhập thông tin tham gia.</Typography.Paragraph>
   <div style={{display:'flex',justifyContent:'center'}}><QRCode value={url} size={224} color="#000000" bgColor="#ffffff" marginSize={4}/></div>
   <Typography.Paragraph copyable={{text:url}} style={{overflowWrap:'anywhere'}}><a href={url} target="_blank" rel="noreferrer">{url}</a></Typography.Paragraph>
   {['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)&&<Typography.Text type="secondary">Địa chỉ localhost chỉ truy cập trên máy này. Để mở bằng điện thoại, cần dùng địa chỉ mạng nội bộ hoặc tên miền của website.</Typography.Text>}
  </Space>
 </FormModal>;
};
