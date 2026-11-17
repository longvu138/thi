import {Link,useParams} from 'react-router-dom';
import {Card,Space,Spin,Typography} from 'antd';
import {ParticipationSummary} from '../../components/exam-rounds/ParticipationSummary';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {ExamRoundSummary} from '../../components/exam-rounds/ExamRoundSummary';
import {useExamRound} from '../../hooks/useExamRounds';
import {useMediaQuery} from '../../hooks/useMediaQuery';
export const ExamRoundDetailPage=()=>{
 const {id}=useParams();const query=useExamRound(id);const round=query.data;
 const compact=useMediaQuery('(max-width:1199.98px)');
 return <Space orientation="vertical" size={16} className="full-width">
  <Link to="/exam-rounds">← Danh sách đợt</Link>
  {query.isError?<QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>:!round?<Spin><Card>Đang tải đợt kiểm tra…</Card></Spin>:<Card className="glass-card"><Typography.Title level={4}>{round.title}</Typography.Title><ExamRoundSummary round={round} compact={compact}/><div style={{marginTop:20}}><ParticipationSummary participation={round.participation}/><StartAttemptButton round={round}/></div></Card>}
 </Space>;
};
