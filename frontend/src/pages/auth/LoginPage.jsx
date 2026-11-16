import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Collapse, Form, Input, Space, Typography } from 'antd';
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
 { name: 'fullName', label: 'Họ và tên', placeholder: 'Nhập đầy đủ họ và tên' },
 { name: 'partyCommittee', label: 'Đảng bộ', placeholder: 'Nhập tên đảng bộ' },
 { name: 'partyBranch', label: 'Chi bộ', placeholder: 'Nhập tên chi bộ' },
];
const ParticipantGuide=()=><section className="participant-guide"><h2><SafetyCertificateOutlined/> Hướng dẫn tham gia</h2><ol><li>Nhập đầy đủ họ tên, đảng bộ và chi bộ của bạn.</li><li>Kiểm tra thông tin trước khi chọn “Vào thi”.</li><li>Dùng đúng thông tin đã nhập trước đó để tiếp tục và giữ lịch sử.</li></ol></section>;
export const LoginPage = ({ onAuthenticated }) => {
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
   onAuthenticated(response);
  } catch (error) { feedback.error(getApiErrorMessage(error, 'Không thể vào thi, vui lòng thử lại')); }
  finally { setLoading(false); }
 };
 return <div className="participant-portal">
  <header className="participant-portal-header"><div className="participant-portal-header-inner">
   <Link to="/login" className="participant-brand" aria-label={`${APP_NAME} - Trang chủ`}><img src="/favicon.svg" width="52" height="52" alt="Biểu trưng VPTW"/><span><strong>{APP_NAME}</strong><small>{APP_DESCRIPTION}</small></span></Link>
   <Button className="participant-website-qr" icon={<QrcodeOutlined/>} onClick={()=>setQrOpen(true)}>Mã QR website</Button>
  </div></header>
  <main className="participant-portal-main">
   <section className="participant-intro" aria-labelledby="participant-title">
    <div className="participant-eyebrow"><span/> HỌC TẬP VÀ ĐÁNH GIÁ NHẬN THỨC</div>
    <h1 id="participant-title">Cổng kiểm tra trực tuyến</h1>
    <p className="participant-description"><span className="participant-description-desktop">Theo dõi các đợt kiểm tra đang mở, chọn nội dung phù hợp và tham gia ngay tại đây. Vui lòng nhập đúng thông tin để ghi nhận kết quả và tra cứu khi cần.</span><span className="participant-description-mobile">Chọn đợt, nhập thông tin và bắt đầu khi sẵn sàng.</span></p>
    <div className="participant-gold-line"/>
    <PublicOpenRounds onSelect={chooseRound} selectedId={selectedId}/>
    <div className="participant-guide-desktop"><ParticipantGuide/></div>
   </section>
   <section ref={formSection} className="participant-form-section" aria-labelledby="participant-form-title">
    <Card className="participant-entry-card" variant="borderless"><Space orientation="vertical" size={20} className="full-width">
     <div className="participant-form-heading"><span className="participant-form-icon"><UserOutlined/></span><small>DÀNH CHO NGƯỜI DỰ THI</small><Typography.Title id="participant-form-title" level={2}>Thông tin tham gia</Typography.Title><Typography.Text type="secondary">Vui lòng nhập đúng thông tin để ghi nhận kết quả</Typography.Text></div>
     {selectedTitle&&<Typography.Text strong>Đợt đã chọn: {selectedTitle}</Typography.Text>}
     <Form layout="vertical" onFinish={submit}>
      {FIELDS.map((field,index) => <Form.Item key={field.name} name={field.name} label={field.label} rules={[{ required: true, whitespace: true, message: `Vui lòng nhập ${field.label.toLowerCase()}` }, { max: 255, message: 'Không quá 255 ký tự' }]}><Input size="large" prefix={[<UserOutlined key="name"/>,<BankOutlined key="party"/>,<TeamOutlined key="branch"/>][index]} autoComplete={field.name === 'fullName' ? 'name' : 'off'} placeholder={field.placeholder}/></Form.Item>)}
      <div className="participant-entry-note"><SafetyCertificateOutlined/><span>Nhập lại cùng họ tên và đơn vị sẽ giữ nguyên người dự thi, lịch sử và số lượt đã dùng.</span></div>
      <Button type="primary" size="large" block htmlType="submit" loading={loading} icon={<ArrowRightOutlined/>} iconPlacement="end">Vào thi</Button>
     </Form>
    </Space></Card>
    <p className="participant-form-caption"><Link to="/receipts">Tra cứu / In lại phiếu kết quả bằng mã</Link></p>
    <p className="participant-form-caption">Thông tin được sử dụng để ghi nhận quá trình tham gia đánh giá.</p>
   </section>
   <div className="participant-guide-mobile"><Collapse items={[{key:'guide',label:'Hướng dẫn tham gia',children:<ParticipantGuide/>}]}/></div>
  </main>
  <a href="/guide" style={{display:"block",textAlign:"center",marginTop:12}}>Hướng dẫn dự thi / In hướng dẫn</a>
  <WebsiteQrModal open={qrOpen} onClose={()=>setQrOpen(false)}/>
  <footer className="participant-portal-footer"><strong>{APP_NAME}</strong><span>{APP_DESCRIPTION}</span></footer>
 </div>;
};
