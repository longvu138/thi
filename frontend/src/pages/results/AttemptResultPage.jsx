import {clearDraft} from '../../utils/attemptStorage';
import {AttemptSnapshotQuestions} from '../../components/attempts/AttemptSnapshotQuestions';
import {useEffect,useState} from 'react';
import {safeLocalStorage} from '../../utils/safeStorage';
import {rememberReceiptCode,RECEIPT_CODES_KEY} from '../../utils/receipts';
import {AttemptReceiptModal} from '../../components/receipts/ReceiptModal';
import { Link, useParams,useLocation,useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Space, Spin, Tag, Typography, Segmented, Empty, Collapse } from 'antd';
import { useAttemptResult,useRoundAttemptHistory } from '../../hooks/useResults';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { formatRoundTime } from '../../utils/examRounds';
import { durationLabel, resultLabel } from '../../utils/results';
import {useExamRound} from '../../hooks/useExamRounds';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import {canTakeNextAttempt,bestPercentage,filterResultQuestions} from '../../utils/examUx';
import './results.css';
export const AttemptResultPage = () => {
 const [filter,setFilter]=useState('all'),[receiptOpen,setReceiptOpen]=useState(false);
 const navigate=useNavigate();
 const {id}=useParams();const location=useLocation();const query=useAttemptResult(id);const row=query.data;
 const closeReceipt=()=>{setReceiptOpen(false);if(location.state?.openReceipt){const state={...location.state};delete state.openReceipt;navigate(location.pathname,{replace:true,state});}};
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
  {location.state?.unrecordedCount>0&&<Alert type="warning" showIcon title={`${location.state.unrecordedCount} lựa chọn chưa kịp ghi nhận trước khi chốt bài.`}/>}
  <Card className="glass-card result-summary">
   <div className="result-heading"><Typography.Title level={4}>{row.title}</Typography.Title><Space wrap>{row.isTrial&&<Tag color="gold">Chạy thử</Tag>}</Space></div>
   <div className="result-hero"><div><Typography.Title level={2} className={`result-outcome ${row.result==='PASS'?'is-pass':'is-fail'}`}>{resultLabel(row.result)}</Typography.Title><Typography.Text type="secondary">Ngưỡng đạt {row.config.passingPercentage}%</Typography.Text></div><div className="result-score"><strong>{row.percentage}<small>%</small></strong><span>{row.correctCount}/{row.config.questionCount} câu đúng</span></div></div>
   <div className="result-facts"><div><span>Trả lời sai</span><strong>{row.incorrectCount} câu</strong></div><div><span>Bỏ trống</span><strong>{row.unansweredCount} câu</strong></div><div><span>Thời gian làm bài</span><strong>{durationLabel(row.durationSeconds)}</strong></div></div>
   <Typography.Paragraph type="secondary" className="result-submitted">{row.status==='EXPIRED'?'Hết giờ, hệ thống đã tự chốt bài':`Đã nộp bài lúc ${formatRoundTime(row.submittedAt)}`}</Typography.Paragraph>
   {row.receiptCode&&<div className="result-receipt"><Typography.Text type="secondary">Mã tra cứu phiếu</Typography.Text><Typography.Text strong copyable>{row.receiptCode}</Typography.Text><Typography.Text type="secondary">Giữ mã để tra cứu và in lại phiếu.</Typography.Text></div>}
   <Space wrap className="result-actions"><Button type="primary" onClick={()=>setReceiptOpen(true)}>Lưu / In phiếu</Button><Link to={`/my-results?examRoundId=${row.examRoundId}`}>Lịch sử làm bài</Link><Link to="/exam-rounds">Về danh sách đợt</Link></Space>
  </Card>
  {canRetry&&<Card className="glass-card result-next"><Typography.Paragraph>Kết quả cao nhất {history.isPending?'đang tải…':history.isError?'chưa tải được':best===null?'chưa có':`${best}%`}</Typography.Paragraph>{history.isError&&<QueryErrorState error={history.error} onRetry={()=>history.refetch()}/>}<StartAttemptButton round={round.data} label="Thi lượt tiếp"/></Card>}
   {round.isError&&<QueryErrorState title="Chưa kiểm tra được lượt thi tiếp" error={round.error} onRetry={()=>round.refetch()}/>}
  <Collapse className="result-details" items={[{key:'answers',label:'Xem lại câu trả lời',children:<Space orientation="vertical" size={16} className="full-width">
  {!reveal && <Alert showIcon type="info" title="Cấu hình của lượt thi này không cho xem đáp án đúng."/>}
  <Segmented aria-label="Lọc câu hỏi kết quả" value={filter} onChange={setFilter} options={[{label:'Tất cả',value:'all'},{label:'Sai',value:'wrong',disabled:!reveal},{label:'Bỏ trống',value:'empty'}]}/>
  {shown.length?<AttemptSnapshotQuestions questions={shown} reveal={reveal}/>:<Card><Empty description="Không có câu hỏi phù hợp"/></Card>}
  </Space>}]} />
  <AttemptReceiptModal attemptId={id} open={receiptOpen||Boolean(location.state?.openReceipt)} onClose={closeReceipt}/>
 </Space>;
};
