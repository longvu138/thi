import {RoundReadiness} from '../../components/exam-rounds/RoundReadiness';
import {RoundStatusModal} from '../../components/exam-rounds/RoundStatusModal';
import {ExamRoundFormModal} from '../../components/exam-rounds/ExamRoundFormModal';
import {useExamRoundMutations} from '../../hooks/useExamRounds';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {RoundStructure} from '../../components/exam-rounds/RoundStructure';
import {useState} from 'react';
import {RoundQrModal} from '../../components/exam-rounds/RoundQrModal';
import {ParticipationSummary} from '../../components/exam-rounds/ParticipationSummary';
import {RoundQuestions} from '../../components/questions/RoundQuestions';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Space, Spin, Tabs, Typography } from 'antd';
import { useExamRound } from '../../hooks/useExamRounds';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { ExamRoundSummary } from '../../components/exam-rounds/ExamRoundSummary';
export const ExamRoundDetailPage = ({ admin = false }) => {
 const [qrOpen,setQrOpen]=useState(false),[tab,setTab]=useState('overview'),[statusOpen,setStatusOpen]=useState(false),[editing,setEditing]=useState(false);
 const mutations=useExamRoundMutations(),feedback=useFeedback();
 const save=async(body)=>{try{await mutations.update.mutateAsync({id,body});setStatusOpen(false);setEditing(false);feedback.success('Đã cập nhật đợt kiểm tra');}catch(error){feedback.error(getApiErrorMessage(error));}};
 const { id } = useParams(); const query = useExamRound(id, admin);
 const compact = useMediaQuery('(max-width: 1199.98px)');
 return <Space orientation="vertical" size={16} className="full-width">
  <div><Link to={admin ? '/admin/exam-rounds' : '/exam-rounds'}><Button>Quay lại danh sách</Button></Link></div>
  {query.isError ? <QueryErrorState error={query.error} onRetry={() => query.refetch()}/> : <Spin spinning={query.isFetching}><Card className="glass-card"><Typography.Title level={4} style={{ marginTop: 0, overflowWrap: 'anywhere' }}>{query.data?.title || 'Chi tiết đợt kiểm tra'}</Typography.Title><div style={{marginBottom:16}}>{admin&&<Button onClick={()=>setQrOpen(true)} style={{marginRight:8}}>Mã QR</Button>}{admin&&<Link to={`/admin/exam-rounds/${id}/reports`}><Button type="primary">Kết quả và báo cáo</Button></Link>}</div>{admin && query.data && <><Space wrap style={{marginBottom:16}}><Button onClick={()=>setEditing(true)}>Sửa thông tin</Button><Button type="primary" onClick={()=>setStatusOpen(true)}>{query.data.status==='OPEN'?'Đóng đợt':'Mở đợt'}</Button></Space><RoundReadiness round={query.data} onTab={setTab}/><Tabs activeKey={tab} onChange={setTab} items={[{key:'overview',label:'Thông tin',children:<ExamRoundSummary round={query.data} compact={compact}/>},{key:'questions',label:'Câu hỏi',children:<RoundQuestions key={id} roundId={id} questionCount={query.data.questionCount}/>},{key:'structure',label:'Cơ cấu đề',children:<RoundStructure roundId={id}/>}]} /></>}{!admin && <ExamRoundSummary round={query.data} compact={compact}/>}{!admin && query.data && <div style={{marginTop:20}}><ParticipationSummary participation={query.data.participation}/><div style={{marginTop:12}}><StartAttemptButton round={query.data}/></div></div>}</Card></Spin>}
  {admin&&<RoundStatusModal round={statusOpen?query.data:null} busy={mutations.update.isPending} onCancel={()=>setStatusOpen(false)} onConfirm={()=>save({status:query.data.status==='OPEN'?'CLOSED':'OPEN'})}/>}
  {admin&&<ExamRoundFormModal editing={editing?query.data:null} compact={compact} busy={mutations.update.isPending} onClose={()=>setEditing(false)} onSave={save}/>}
  {admin&&<RoundQrModal key={qrOpen? id:'closed'} round={qrOpen?query.data:null} onClose={()=>setQrOpen(false)}/>}
 </Space>;
};
