import {EntryReceiptPreview} from '../../components/receipts/EntryReceiptPreview';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Collapse, Form, Input, Space, Typography } from 'antd';
import {examRoundsApi} from '../../api/examRoundsApi';
import {attemptsApi} from '../../api/attemptsApi';
import {enterSingleRound} from '../../utils/participantEntry';
import { authApi } from '../../api/authApi';
import { UserOutlined, BankOutlined, TeamOutlined, ArrowRightOutlined, SafetyCertificateOutlined, QrcodeOutlined } from '@ant-design/icons';
import './participant-entry.css';
import { APP_NAME, APP_DESCRIPTION } from '../../constants/app';
import { useFeedback } from '../../hooks/useFeedback';
import { getApiErrorMessage } from '../../utils/apiError';
import {WebsiteQrModal} from '../../components/exam-rounds/WebsiteQrModal';
import {PublicOpenRounds} from '../../components/exam-rounds/PublicOpenRounds';
import {participantReturnPath} from '../../utils/authRouting';
const FIELDS = [
 { name: 'fullName', label: 'Họ và tên', placeholder: 'Ví dụ: Nguyễn Văn An', example:'Nguyễn Văn An', hint:'Viết đầy đủ họ tên, có dấu, đúng như hồ sơ.' },
 { name: 'partyCommittee', label: 'Đảng bộ', placeholder: 'Ví dụ: Đảng bộ Kho bạc Nhà nước', example:'Đảng bộ Kho bạc Nhà nước', hint:'Ghi đầy đủ tên đảng bộ, gồm cả chữ “Đảng bộ”.' },
 { name: 'partyBranch', label: 'Chi bộ', placeholder: 'Ví dụ: Chi bộ Văn phòng', example:'Chi bộ Văn phòng', hint:'Ghi đầy đủ tên chi bộ, gồm cả chữ “Chi bộ”.' },
];
const ParticipantInfoPreview=({values={},title})=><section className="participant-info-preview">
 <h2><SafetyCertificateOutlined/> Xem trước mẫu phiếu PDF</h2>
 <p>Đây là đúng mẫu phiếu dùng khi in và tải PDF. Nhập thông tin để kiểm tra họ tên, đảng bộ và chi bộ trên phiếu.</p>
 <EntryReceiptPreview values={values} title={title}/>
 <ul><li>Viết tiếng Việt có dấu, không viết tắt tên đơn vị.</li><li>Không nhập thêm chức danh, số điện thoại vào ô họ tên.</li><li>Lần sau dùng lại đúng họ tên, đảng bộ và chi bộ để tiếp tục lịch sử.</li></ul>
 <p className="participant-info-example-note">Phiếu xem trước chưa có kết quả. Điểm, thời gian nộp và mã xác nhận chỉ xuất hiện sau khi hoàn thành bài thi.</p>
</section>;
export const LoginPage = ({ onAuthenticated }) => {
 const [form]=Form.useForm();const values=Form.useWatch([],form)||{};
 const [qrOpen,setQrOpen]=useState(false),[selectedTitle,setSelectedTitle]=useState('');
 const [search,setSearch]=useSearchParams();const formSection=useRef(null);
 const selectedId=participantReturnPath(`?${search}`)?.match(/^\/exam-rounds\/(.+)$/)?.[1];
 const chooseRound=round=>{setSearch({continue:`/exam-rounds/${round.id}`},{replace:true});setSelectedTitle(round.title);formSection.current?.scrollIntoView({behavior:'smooth',block:'start'});};
 const [loading, setLoading] = useState(false); const feedback = useFeedback();
 const submit = async values => {
  if (loading) return; setLoading(true);
  try {
   const response = await authApi.enter(values);
   if (!response?.user) throw new Error('Không nhận được thông tin người dự thi');
   let target=participantReturnPath(`?${search}`);
   try {
    target=await enterSingleRound({returnPath:participantReturnPath(`?${search}`),list:()=>examRoundsApi.publicList({page:1,limit:100}),get:id=>examRoundsApi.get({admin:false,id}),start:attemptsApi.start});
   } catch(error) { feedback.error(getApiErrorMessage(error,error.entryReason||'Chưa thể mở bài, vui lòng thử lại')); return; }
   onAuthenticated(response,target);
  } catch (error) { feedback.error(getApiErrorMessage(error, 'Không thể vào thi, vui lòng thử lại')); }
  finally { setLoading(false); }
 };
 return <div className="participant-portal">
  <header className="participant-portal-header"><div className="participant-portal-header-inner">
   <Link to="/" className="participant-brand" aria-label={`${APP_NAME} - Trang chủ`}><span><strong>{APP_NAME}</strong><small>{APP_DESCRIPTION}</small></span></Link>
   <Button className="participant-website-qr" icon={<QrcodeOutlined/>} onClick={()=>setQrOpen(true)}>Mã QR website</Button>
  </div></header>
  <main className="participant-portal-main">
   <section className="participant-intro" aria-label="Đợt kiểm tra và gợi ý điền thông tin">
    {/* <div className="participant-eyebrow"><span/> HỌC TẬP VÀ ĐÁNH GIÁ NHẬN THỨC</div> */}
    {/* <h1 id="participant-title">Cổng kiểm tra trực tuyến</h1> */}
    {/* <p className="participant-description"><span className="participant-description-desktop">Theo dõi các đợt kiểm tra đang mở, chọn nội dung phù hợp và tham gia ngay tại đây. Vui lòng nhập đúng thông tin để ghi nhận kết quả và tra cứu khi cần.</span><span className="participant-description-mobile">Chọn đợt, nhập thông tin và bắt đầu khi sẵn sàng.</span></p> */}
    {/* <div className="participant-gold-line"/> */}
    <div className="participant-guide-desktop"><ParticipantInfoPreview values={values} title={selectedTitle}/></div>
    <PublicOpenRounds onSelect={chooseRound} selectedId={selectedId}/>
   </section>
   <section ref={formSection} className="participant-form-section" aria-labelledby="participant-form-title">
    <Card className="participant-entry-card" variant="borderless"><Space orientation="vertical" size={20} className="full-width">
     <div className="participant-form-heading"><span className="participant-form-icon"><UserOutlined/></span><small>DÀNH CHO NGƯỜI DỰ THI</small><Typography.Title id="participant-form-title" level={2}>Thông tin tham gia</Typography.Title><Typography.Text type="secondary">Vui lòng nhập đúng thông tin để ghi nhận kết quả</Typography.Text></div>
     {selectedTitle&&<Typography.Text strong>Đợt đã chọn: {selectedTitle}</Typography.Text>}
     <Form form={form} layout="vertical" onFinish={submit}>
      {FIELDS.map((field,index) => <Form.Item key={field.name} name={field.name} label={field.label} extra={field.hint} rules={[{ required: true, whitespace: true, message: `Vui lòng nhập ${field.label.toLowerCase()}` }, { max: 255, message: 'Không quá 255 ký tự' }]}><Input size="large" prefix={[<UserOutlined key="name"/>,<BankOutlined key="party"/>,<TeamOutlined key="branch"/>][index]} autoComplete={field.name === 'fullName' ? 'name' : 'off'} placeholder={field.placeholder}/></Form.Item>)}
      {/* <div className="participant-entry-note"><SafetyCertificateOutlined/><span>Khi chỉ có một đợt đang mở, bấm Vào thi sẽ bắt đầu hoặc tiếp tục bài ngay. Nhập lại cùng họ tên và đơn vị để giữ lịch sử và số lượt đã dùng.</span></div> */}
      <Button type="primary" size="large" block htmlType="submit" loading={loading} icon={<ArrowRightOutlined/>} iconPlacement="end">Vào thi</Button>
     </Form>
    </Space></Card>
    <p className="participant-form-caption"><Link to="/receipts">Tra cứu / In lại phiếu kết quả bằng mã</Link></p>
    <p className="participant-form-caption">Thông tin được sử dụng để ghi nhận quá trình tham gia đánh giá.</p>
   </section>
   <div className="participant-guide-mobile"><Collapse items={[{key:'guide',label:'Xem mẫu thông tin trên phiếu PDF',children:<ParticipantInfoPreview values={values} title={selectedTitle}/>}]}/></div>
  </main>
  <WebsiteQrModal open={qrOpen} onClose={()=>setQrOpen(false)}/>
  <footer className="participant-portal-footer"><strong>{APP_NAME}</strong><span>{APP_DESCRIPTION}</span></footer>
 </div>;
};
