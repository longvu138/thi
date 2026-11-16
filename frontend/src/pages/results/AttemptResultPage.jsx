import {clearDraft} from '../../utils/attemptStorage';
import {AttemptSnapshotQuestions} from '../../components/attempts/AttemptSnapshotQuestions';
import {useEffect,useState} from 'react';
import {safeLocalStorage} from '../../utils/safeStorage';
import {rememberReceiptCode,RECEIPT_CODES_KEY} from '../../utils/receipts';
import { Link, useParams,useLocation } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Typography, Segmented, Empty } from 'antd';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useAttemptResult,useRoundAttemptHistory } from '../../hooks/useResults';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { formatRoundTime } from '../../utils/examRounds';
import { durationLabel, resultLabel } from '../../utils/results';
import {useExamRound} from '../../hooks/useExamRounds';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import {canTakeNextAttempt,bestPercentage,filterResultQuestions} from '../../utils/examUx';
import './results.css';
export const AttemptResultPage = () => {
 const mobile=useMediaQuery('(max-width:767.98px)'),tablet=useMediaQuery('(max-width:1199.98px)');
 const [filter,setFilter]=useState('all');
 const {id}=useParams();const location=useLocation();const query=useAttemptResult(id);const row=query.data;
 const round=useExamRound(row?.examRoundId);const canRetry=canTakeNextAttempt(round.data);
 const history=useRoundAttemptHistory(row?.examRoundId,canRetry);
 const best=bestPercentage(history.data||[],Boolean(round.data?.participation?.isTrial));
 useEffect(()=>{if(row&&row.status!=='IN_PROGRESS')clearDraft(id);},[row,id]);
 useEffect(()=>{if(row?.receiptCode)safeLocalStorage.setItem(RECEIPT_CODES_KEY,JSON.stringify(rememberReceiptCode(safeLocalStorage.getItem(RECEIPT_CODES_KEY),row.receiptCode)));},[row?.receiptCode]);
 if(query.isError)return <Space orientation="vertical" className="full-width"><QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>{query.error?.response?.status===409 && <Link to={`/attempts/${id}`}><Button>Tiếp tục làm bài</Button></Link>}<Link to="/my-results">Về lịch sử cá nhân</Link></Space>;
 if(!row)return <Spin><Card>Đang tải kết quả…</Card></Spin>;
 const reveal=row.status!=='IN_PROGRESS' && row.config.showCorrectAnswers===true;
 const shown=filterResultQuestions(row.questions,filter,reveal);
 return <Space orientation="vertical" size={16} className="full-width result-workspace">
  <Card className="glass-card"><Typography.Paragraph>{row.status==='EXPIRED'?'Hết giờ, hệ thống đã tự chốt bài':`Đã nộp bài lúc ${formatRoundTime(row.submittedAt)}`}</Typography.Paragraph>{location.state?.unrecordedCount>0&&<Alert type="warning" showIcon title={`${location.state.unrecordedCount} lựa chọn chưa kịp ghi nhận trước khi chốt bài.`}/>}<Typography.Title level={4} style={{marginTop:0,overflowWrap:'anywhere'}}>{row.title}</Typography.Title><Typography.Title level={2} className={`result-outcome ${row.result==='PASS'?'is-pass':'is-fail'}`}>{resultLabel(row.result)}</Typography.Title><Typography.Paragraph className="result-score"><strong>{row.correctCount}/{row.config.questionCount}</strong> câu đúng · {row.percentage}% · Ngưỡng đạt {row.config.passingPercentage}%</Typography.Paragraph><Space wrap><Tag>Lượt {row.attemptNumber}</Tag><Tag>{resultLabel(row.status)}</Tag>{row.isTrial && <Tag color="gold">Chạy thử — không tính kết quả chính thức</Tag>}</Space>
   {row.receiptCode&&<Alert className="result-receipt" showIcon type="success" title={<span>Mã tra cứu phiếu: <Typography.Text copyable>{row.receiptCode}</Typography.Text></span>} description="Lưu mã để tra cứu và in lại phiếu khi không còn phiên đăng nhập."/>}
   <Space wrap className="result-actions"><Link to={`/attempts/${id}/receipt`}><Button type="primary">Phiếu kết quả / In phiếu</Button></Link><Link to={`/my-results?examRoundId=${row.examRoundId}`}><Button>Lịch sử đợt này</Button></Link><Link to="/exam-rounds"><Button>Về danh sách đợt</Button></Link></Space>
   {round.isError&&<QueryErrorState title="Chưa kiểm tra được lượt thi tiếp" error={round.error} onRetry={()=>round.refetch()}/>}
   {canRetry&&<div className="result-next"><Typography.Paragraph>Còn {round.data.participation.isTrial?round.data.participation.trialRemainingAttempts:round.data.participation.remainingAttempts} lượt · Kết quả cao nhất {history.isPending?'đang tải…':history.isError?'chưa tải được':best===null?'chưa có':`${best}%`}</Typography.Paragraph>{history.isError&&<QueryErrorState error={history.error} onRetry={()=>history.refetch()}/>}<StartAttemptButton round={round.data} label="Thi lượt tiếp"/></div>}
  </Card>
  <Card className="glass-card" title="Thống kê chi tiết"><Descriptions column={mobile?1:tablet?2:3} items={[
    {key:'score',label:'Tỷ lệ đúng',children:`${row.percentage}%`},{key:'threshold',label:'Ngưỡng đạt',children:`${row.config.passingPercentage}%`},
    {key:'count',label:'Tổng số câu',children:row.config.questionCount},{key:'correct',label:'Số câu đúng',children:row.correctCount},
    {key:'wrong',label:'Số câu chọn sai',children:row.incorrectCount},{key:'empty',label:'Chưa trả lời',children:row.unansweredCount},
    {key:'start',label:'Bắt đầu',children:formatRoundTime(row.startedAt)},{key:'end',label:'Kết thúc',children:formatRoundTime(row.submittedAt)},
    {key:'duration',label:'Thời gian làm bài',children:durationLabel(row.durationSeconds)},
   ]}/></Card>
  {!reveal && <Alert showIcon type="info" title="Cấu hình của lượt thi này không cho xem đáp án đúng."/>}
  <Segmented aria-label="Lọc câu hỏi kết quả" value={filter} onChange={setFilter} options={[{label:'Tất cả',value:'all'},{label:'Sai',value:'wrong',disabled:!reveal},{label:'Bỏ trống',value:'empty'}]}/>
  {shown.length?<AttemptSnapshotQuestions questions={shown} reveal={reveal}/>:<Card><Empty description="Không có câu hỏi phù hợp"/></Card>}
 </Space>;
};
