import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Alert,Button,Card,Input,QRCode,Space,Typography} from 'antd';
import {useGuide,useSaveGuide} from '../../hooks/useGuide';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import './guide.css';
export const GuidePage=({admin=false})=>{
 const query=useGuide(),save=useSaveGuide();const [contact,setContact]=useState(null);
 const url=new URL('/login',import.meta.env.VITE_PUBLIC_APP_URL||window.location.origin).href;
 return <main className="guide-page"><Card className="glass-card">
  <Space wrap className="guide-controls"><Link to={admin?'/admin/exam-rounds':'/login'}><Button>Quay lại</Button></Link><Button type="primary" disabled={!query.data} onClick={()=>window.print()}>In hướng dẫn A4</Button></Space>
  <Typography.Title level={2}>Hướng dẫn dự thi</Typography.Title>
  <div className="guide-qr"><QRCode type="svg" value={url} size={160} color="#000000" bgColor="#ffffff" marginSize={4}/><Typography.Paragraph style={{overflowWrap:'anywhere'}}>{url}</Typography.Paragraph></div>
  <ol>
   <li>Quét mã QR hoặc truy cập địa chỉ website. Chọn đợt kiểm tra đang mở.</li>
   <li>Nhập chính xác họ tên, đảng bộ và chi bộ. Dùng thống nhất thông tin khi quay lại.</li>
   <li>Kiểm tra số câu, thời lượng và số lượt tối đa trên màn xác nhận. Chỉ bắt đầu khi sẵn sàng; thời gian vẫn chạy khi rời trang.</li>
   <li>Chọn đáp án, dùng Câu trước / Câu sau hoặc danh sách câu để kiểm tra bài. Có thể bật hoặc tắt tự sang câu.</li>
   <li>Mạng yếu: tiếp tục chọn đáp án. Lựa chọn giữ tạm trong tab hiện tại và gửi ngầm khoảng 30 giây/lần. Không đóng trình duyệt hoặc xóa dữ liệu khi chưa nộp.</li>
   <li>Bấm Nộp bài và chờ màn kết quả. Hệ thống gửi toàn bộ lựa chọn khi nộp; nếu chưa xác nhận, giữ trang và dùng Nộp lại. Lựa chọn đến sau hạn cho phép không được tính.</li>
   <li>Lưu mã tra cứu trên màn kết quả. Bấm Phiếu kết quả / In phiếu; có thể tra cứu mã tại cổng dự thi để in lại.</li>
  </ol>
  <Typography.Title level={4}>Đầu mối hỗ trợ</Typography.Title>
  {query.isError?<QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>:<Typography.Paragraph style={{whiteSpace:'pre-wrap'}}>{query.data?.supportContact||'Ban tổ chức chưa cập nhật đầu mối hỗ trợ.'}</Typography.Paragraph>}
  {admin&&<Space orientation="vertical" className="full-width guide-controls"><Input.TextArea aria-label="Đầu mối hỗ trợ" maxLength={1000} rows={3} value={contact??query.data?.supportContact??''} onChange={e=>setContact(e.target.value)}/><Button loading={save.isPending} onClick={()=>save.mutate({supportContact:contact??query.data?.supportContact??''})}>Lưu đầu mối hỗ trợ</Button>{save.isSuccess&&<Alert type="success" title="Đã lưu đầu mối hỗ trợ"/>}{save.isError&&<QueryErrorState error={save.error}/>}</Space>}
 </Card></main>;
};
