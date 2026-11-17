import {useEffect,useState} from 'react';
import {useOutletContext,useParams} from 'react-router-dom';
import {Button,Card,Drawer,Space,Spin,Switch,Tag,Tooltip,Typography} from 'antd';
import {ClockCircleOutlined,CloudSyncOutlined,CheckCircleOutlined,WifiOutlined,UnorderedListOutlined} from '@ant-design/icons';
import {useAttemptSession} from '../../hooks/useAttempts';
import {useAttemptLeaveGuard} from '../../hooks/useAttemptLeaveGuard';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {formatAttemptClock,attemptShortcut,nextQuestionIndex} from '../../utils/attempts';
import {getPosition,setPosition,getAutoAdvance,setAutoAdvance} from '../../utils/attemptStorage';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {FormModal} from '../../components/common/FormModal';
import {AttemptQuestion} from '../../components/attempts/AttemptQuestion';
import {AttemptNavigator} from '../../components/attempts/AttemptNavigator';
import {attemptProgressLabel,submitConfirmation} from '../../utils/examUx';
import {nextAction} from '../../utils/participantEntry';
import './attempts.css';
const AttemptWorkspace=({id})=>{
 const {currentUser}=useOutletContext()||{},session=useAttemptSession(id);
 const {query,state,online,remaining,choose,finish,reminder}=session;
 const mobile=useMediaQuery('(max-width:767.98px)'),desktop=useMediaQuery('(min-width:1024px) and (pointer:fine)');
 const [current,setCurrent]=useState(()=>getPosition(id)),[confirmOpen,setConfirmOpen]=useState(false),[drawer,setDrawer]=useState(false),[auto,setAuto]=useState(()=>getAutoAdvance(window.matchMedia('(max-width:767.98px)').matches));
 const attempt=state.attempt,questions=attempt?.questions||[],index=Math.min(current,Math.max(0,questions.length-1)),question=questions[index];
 const leave=useAttemptLeaveGuard(attempt?.status,state.submitting);
 const closed=attempt&&attempt.status!=='IN_PROGRESS',disabled=state.submitting||remaining===0||closed;
 const unanswered=questions.flatMap((q,i)=>state.selected[q.id]?[]:[i]);
 const go=value=>{const next=Math.max(0,Math.min(questions.length-1,value));setCurrent(next);if(!disabled)setPosition(id,next);};
 const select=answer=>{choose(question.id,answer);go(nextQuestionIndex(index,questions.length,auto,answer));};
 useEffect(()=>{
  const onKey=event=>{const action=attemptShortcut(event,{dialog:confirmOpen||drawer||[...document.querySelectorAll('[role="dialog"]')].some(el=>el.getClientRects().length>0),enabled:desktop&&!disabled});if(!action)return;event.preventDefault();if(action.move){setCurrent(v=>{const next=Math.max(0,Math.min(questions.length-1,v+action.move));setPosition(id,next);return next;});}else if(question?.options.some(o=>o.key===action.answer)){choose(question.id,action.answer);setCurrent(v=>{const next=nextQuestionIndex(v,questions.length,auto,action.answer);setPosition(id,next);return next;});}};
  document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
 },[confirmOpen,drawer,desktop,disabled,question,questions.length,choose,auto,id]);
 const submit=()=>{setConfirmOpen(false);finish().catch(()=>undefined);};
 if(!attempt)return query.isError?<QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>:<Spin><Card>Đang tải đề và khôi phục câu trả lời…</Card></Spin>;
 if(closed)return <Card>Đang mở kết quả…</Card>;
 const dirty=state.pendingCount>0||!online;
 const status=dirty?'Chưa đồng bộ – sẽ gửi khi nộp':'Đã lưu';
 const notice=state.submitting?'Đang nộp bài…':state.submitError?'Chưa xác nhận được nộp bài. Vui lòng bấm Nộp lại.':remaining===0?'Hết giờ, đang xác nhận kết quả…':reminder||'';
 const autoAdvance=<Space wrap className="attempt-auto-advance"><Switch aria-label="Tự sang câu sau khi chọn" checked={auto} disabled={disabled} onChange={value=>{setAuto(value);setAutoAdvance(value);}}/><Typography.Text>Tự sang câu sau khi chọn</Typography.Text></Space>;
 const navigation=<><Button disabled={index===0||state.submitting} onClick={()=>go(index-1)}>‹ Câu trước</Button><Button type="text" onClick={()=>setDrawer(true)} aria-label="Mở danh sách câu hỏi">{attemptProgressLabel(index,questions.length,questions.length-unanswered.length)} <UnorderedListOutlined/></Button><Button type="primary" disabled={state.submitting||closed} onClick={()=>nextAction(index,questions.length)==='submit'?setConfirmOpen(true):go(index+1)}>{nextAction(index,questions.length)==='submit'?'Nộp bài':'Câu sau ›'}</Button></>;
 return <Space orientation="vertical" size={16} className="full-width attempt-workspace">
  <Card className="glass-card attempt-toolbar"><div className="attempt-toolbar-row"><div className="attempt-heading"><Typography.Title className="attempt-round-title" level={4} style={{margin:'0 0 6px',overflowWrap:'anywhere'}}>{attempt.title}</Typography.Title><Space wrap className="attempt-secondary-tags"><Tag>Lượt {attempt.attemptNumber}</Tag>{attempt.isTrial&&<Tag color="gold">Chạy thử</Tag>}<Typography.Text type="secondary">{questions.length} câu</Typography.Text></Space></div><Space wrap><div className={`attempt-clock${remaining<=600?' is-warning':''}`} role="timer"><ClockCircleOutlined/> {formatAttemptClock(remaining)} <Tooltip title={`${status}${state.pendingCount?` (${state.pendingCount} câu)`:''}`}><span className="attempt-sync-icon" role="img" aria-label={status}>{!online?<WifiOutlined/>:dirty?<CloudSyncOutlined/>:<CheckCircleOutlined/>}</span></Tooltip></div><Button type="primary" loading={state.submitting} onClick={()=>state.submitError?submit():setConfirmOpen(true)} disabled={remaining===0&&!state.submitError}>{state.submitError?'Nộp lại':'Nộp bài'}</Button></Space></div>{notice&&<div className="attempt-fixed-notice" role="status">{notice}</div>}</Card>
  <div className="attempt-grid"><div>{!mobile&&autoAdvance}<AttemptQuestion question={question} index={index} total={questions.length} selected={state.selected[question?.id]??null} disabled={disabled} mobile={mobile} onSubmit={()=>setConfirmOpen(true)} onChoose={select} onMove={direction=>go(index+direction)}/></div>{!mobile&&<AttemptNavigator currentUser={currentUser} questions={questions} selected={state.selected} currentIndex={index} onSelect={go}/>}</div>
  {mobile&&<div className="attempt-mobile-navigation">{navigation}</div>}
  {desktop&&<Typography.Text type="secondary">Phím tắt: ← / → chuyển câu, A / B / C / D chọn đáp án.</Typography.Text>}
  <Drawer rootClassName="attempt-question-drawer" title="Danh sách câu hỏi" open={drawer} onClose={()=>setDrawer(false)}><div className="participant-portal participant-session attempt-question-drawer-body">{autoAdvance}<AttemptNavigator embedded currentUser={currentUser} questions={questions} selected={state.selected} currentIndex={index} onSelect={value=>{go(value);setDrawer(false);}}/></div></Drawer>
  <FormModal open={confirmOpen} onCancel={()=>setConfirmOpen(false)} width={520} title="Xác nhận nộp bài" footer={<Space wrap><Button onClick={()=>setConfirmOpen(false)}>Tiếp tục làm bài</Button><Button type="primary" onClick={submit}>Xác nhận nộp bài</Button></Space>}><Typography.Paragraph>{submitConfirmation(unanswered.length,questions.length)}</Typography.Paragraph><Space wrap>{unanswered.map(i=><Button key={i} onClick={()=>{go(i);setConfirmOpen(false);}}>Câu {i+1}</Button>)}</Space><Typography.Paragraph style={{marginTop:16}}>Toàn bộ lựa chọn hiện tại sẽ được gửi khi nộp. Sau khi nộp, bạn không thể thay đổi câu trả lời.</Typography.Paragraph></FormModal>
  <FormModal open={state.submitting} busy title="Đang nộp bài…" width={400} footer={null}><Spin/> <Typography.Text>Vui lòng chờ máy chủ xác nhận. Hệ thống tự thử lại khi kết nối gián đoạn.</Typography.Text></FormModal>
  <FormModal open={leave.state==='blocked'} title="Rời trang làm bài?" width={440} onCancel={()=>leave.reset?.()} footer={<Space><Button onClick={()=>leave.reset?.()}>Ở lại làm bài</Button><Button danger onClick={()=>{session.save(true).catch(()=>undefined);leave.proceed?.();}}>Rời trang</Button></Space>}><Typography.Paragraph>Bài chưa được nộp. Thời gian vẫn tiếp tục tính khi bạn rời trang. Bạn có muốn rời trang?</Typography.Paragraph></FormModal>
 </Space>;
};
export const AttemptPage=()=>{const {id}=useParams();return <AttemptWorkspace key={id} id={id}/>;};
