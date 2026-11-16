import {CommitteeReport} from '../../components/reports/CommitteeReport';
import {AdminAttemptHistory} from '../../components/reports/AdminAttemptHistory';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useRoundReport, useQuestionReport, useReportActions,useCommitteeReport } from '../../hooks/useReports';
import { useFeedback } from '../../hooks/useFeedback';
import { getApiErrorMessage } from '../../utils/apiError';
import { REPORT_METRICS, REPORT_RESULTS, reportFilters, saveReportBlob } from '../../utils/reports';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { FormModal } from '../../components/common/FormModal';
import './reports.css';
import { ReportTables } from '../../components/reports/ReportTables';
export const RoundReportPage=()=>{
 const [activeTab,setActiveTab]=useState('people');const [participant,setParticipant]=useState(null);const [committeePage,setCommitteePage]=useState({page:1,limit:20});const [committeeName,setCommitteeName]=useState('');
 const [filterOpen,setFilterOpen]=useState(false);const [form]=Form.useForm();
 const {id}=useParams();const [filters,setFilters]=useState({isTrial:'false'});const [page,setPage]=useState({page:1,limit:20});const [qPage,setQPage]=useState({page:1,limit:20});const [sort,setSort]=useState({sort:'correctRate',order:'asc'});
 const report=useRoundReport(id,{...filters,...page});const questions=useQuestionReport(id,{...filters,...sort,...qPage});const actions=useReportActions();const feedback=useFeedback();
 const committees=useCommitteeReport(id,{...filters,...committeePage});
 const exporting=actions.exportFile.isPending;const clearing=actions.clearTrial.isPending;
 const apply=values=>{setFilters(reportFilters(values));setPage({page:1,limit:20});setQPage({page:1,limit:20});setCommitteePage({page:1,limit:20});setCommitteeName('');setFilterOpen(false);};
 const download=async()=>{try{const blob=await actions.exportFile.mutateAsync({id,params:{...filters,...sort}});saveReportBlob(blob,`bao-cao-${id}.xlsx`);feedback.success('Đã tải báo cáo Excel theo bộ lọc đang áp dụng');}catch(error){feedback.error(getApiErrorMessage(error));}};
 const clear=async()=>{try{const data=await actions.clearTrial.mutateAsync(id);feedback.success(`Đã xóa ${data.deletedCount} lượt chạy thử`);}catch(error){feedback.error(getApiErrorMessage(error));}};
 return <div className="report-workspace">
  <Link to={`/admin/exam-rounds/${id}`}><Button>Về đợt kiểm tra</Button></Link>
  <Card className="glass-card"><Space wrap style={{justifyContent:'space-between',width:'100%'}}><div><Typography.Title level={4} style={{marginTop:0,overflowWrap:'anywhere'}}>Báo cáo: {report.data?.round?.title||'Đợt kiểm tra'}</Typography.Title><Tag color={filters.isTrial==='true'?'gold':'blue'}>{filters.isTrial==='true'?'Dữ liệu chạy thử':'Dữ liệu chính thức'}</Tag></div><Space wrap><Button icon={<FilterOutlined/>} disabled={exporting||clearing} onClick={()=>{form.resetFields();form.setFieldsValue(filters);setFilterOpen(true);}}>Bộ lọc</Button><Button icon={<ReloadOutlined/>} onClick={()=>{report.refetch();questions.refetch();committees.refetch();}}>Làm mới</Button><Button type="primary" icon={<DownloadOutlined/>} loading={exporting} disabled={!report.data||report.isFetching||report.isError||clearing} onClick={download}>Xuất Excel</Button></Space></Space>
  <Space wrap style={{marginTop:16}}>{[['search','Tìm'],['partyCommittee','Đảng bộ'],['partyBranch','Chi bộ'],['result','Kết quả']].filter(([key])=>filters[key]).map(([key,label])=><Tag key={key}>{label}: {REPORT_RESULTS.find(item=>item.value===filters[key])?.label||filters[key]}</Tag>)}</Space><Typography.Paragraph type="secondary" style={{marginBottom:0}}>Nhấn Áp dụng sau khi thay đổi. Các chỉ số, bảng và Excel dùng chung bộ lọc đã áp dụng; Excel xuất toàn bộ dữ liệu phù hợp, không giới hạn ở trang hiện tại.</Typography.Paragraph></Card>
  <FormModal open={filterOpen} onCancel={()=>setFilterOpen(false)} title="Lọc báo cáo" width={760} footer={<Space wrap><Button onClick={()=>form.resetFields()}>Xóa bộ lọc</Button><Button onClick={()=>setFilterOpen(false)}>Hủy</Button><Button type="primary" onClick={()=>form.submit()}>Áp dụng</Button></Space>}>  <Form form={form} layout="vertical" initialValues={{isTrial:'false'}} onFinish={apply} style={{marginTop:20}}><Row gutter={16}>
   <Col xs={24} sm={12} lg={12}><Form.Item name="search" label="Tìm họ tên / đơn vị"><Input allowClear maxLength={255}/></Form.Item></Col>
   <Col xs={24} sm={12} lg={12}><Form.Item name="partyCommittee" label="Đảng bộ"><Input allowClear maxLength={255}/></Form.Item></Col>
   <Col xs={24} sm={12} lg={12}><Form.Item name="partyBranch" label="Chi bộ"><Input allowClear maxLength={255}/></Form.Item></Col>
   <Col xs={24} sm={12} lg={12}><Form.Item name="result" label="Kết quả cuối"><Select allowClear placeholder="Tất cả" options={REPORT_RESULTS}/></Form.Item></Col>
   <Col xs={24} sm={12} lg={12}><Form.Item name="isTrial" label="Loại dữ liệu"><Select options={[{value:'false',label:'Chính thức'},{value:'true',label:'Chạy thử'}]}/></Form.Item></Col>

  </Row></Form></FormModal>
  <Alert type="info" showIcon title="Mỗi người chỉ được đếm một lần" description="Có ít nhất một lượt Đạt thì kết quả cuối là Đạt. Chưa hoàn thành là người chưa Đạt nhưng vẫn còn khả năng thi. Điểm cao nhất là tỷ lệ đúng cao nhất của các lượt đã chốt."/>
  {report.isError&&<QueryErrorState error={report.error} onRetry={()=>report.refetch()}/>}
  <Row gutter={[16,16]}>{REPORT_METRICS.map(([key,label])=><Col key={key} xs={12} sm={12} lg={6}><Card className="glass-card" loading={report.isLoading}><Statistic title={label} value={report.data?.statistics?.[key]||0} precision={['passRate','averageAttempts'].includes(key)?2:0}/></Card></Col>)}</Row>
  {filters.committeeKey&&<Tag closable onClose={()=>{const next={...filters};delete next.committeeKey;setFilters(next);setCommitteeName('');setPage({...page,page:1});}}>Đảng bộ: {committeeName}</Tag>}
  <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{key:'committees',label:'Theo đảng bộ',children:<Space orientation="vertical" className="full-width">{committees.isError&&<QueryErrorState error={committees.error} onRetry={()=>committees.refetch()}/>}<CommitteeReport data={committees.data} loading={committees.isFetching} page={committeePage} onPage={setCommitteePage} onSelect={row=>{setFilters({...filters,committeeKey:row.committeeKey});setCommitteeName(row.partyCommittee);setPage({...page,page:1});setActiveTab('people');}}/></Space>},{key:'people',label:'Kết quả người dự thi',children:<ReportTables onParticipant={setParticipant} data={report.data} loading={report.isFetching} page={page} onPage={setPage}/>},{key:'questions',label:'Theo câu hỏi',children:<Space orientation="vertical" size={16} className="full-width"><Alert type="info" showIcon title="Chỉ tính lượt đã chốt trong loại dữ liệu và bộ lọc đang áp dụng" description="A/B/C/D là phương án gốc trước xáo trộn. Nội dung được lưu lúc làm bài. Nếu câu đã sửa nhiều lần, hiển thị một phiên bản đại diện và cộng lượt của các phiên bản."/><Space wrap><Select aria-label="Sắp xếp thống kê câu hỏi" value={sort.sort} style={{width:200}} options={[{value:'correctRate',label:'Theo tỷ lệ đúng'},{value:'encounterCount',label:'Theo số lượt gặp'}]} onChange={value=>{setSort({...sort,sort:value});setQPage({...qPage,page:1});}}/><Select aria-label="Thứ tự thống kê câu hỏi" value={sort.order} style={{width:130}} options={[{value:'asc',label:'Tăng dần'},{value:'desc',label:'Giảm dần'}]} onChange={value=>{setSort({...sort,order:value});setQPage({...qPage,page:1});}}/></Space>{questions.isError&&<QueryErrorState error={questions.error} onRetry={()=>questions.refetch()}/>}<ReportTables questions data={questions.data} loading={questions.isFetching} page={qPage} onPage={setQPage}/></Space>}]}/>
  {filters.isTrial==='true'&&<Card className="glass-card"><Space wrap><Typography.Text>Xóa toàn bộ lượt chạy thử của đợt này, không chỉ các hàng đang lọc.</Typography.Text><Popconfirm title="Xóa toàn bộ dữ liệu chạy thử của đợt?" description="Thao tác không thể khôi phục. Lượt chính thức được giữ nguyên." okText="Xóa lượt thử" cancelText="Hủy" onConfirm={clear}><Button danger loading={clearing} disabled={exporting}>Xóa dữ liệu chạy thử</Button></Popconfirm></Space></Card>}
  <AdminAttemptHistory key={participant?.userId||'closed'} roundId={id} participant={participant} onClose={()=>setParticipant(null)}/>
 </div>;
};
