import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Alert,Button,Card,Col,Input,List,Row,Space,Statistic,Typography} from 'antd';
import {useStructure} from '../../hooks/useStructure';
import {useRoundReport,useQuestionReport,useReportActions} from '../../hooks/useReports';
import {reportsApi} from '../../api/reportsApi';
import {RoundStatus} from '../../components/exam-rounds/ExamRoundSummary';
import {AdminAttemptHistory} from '../../components/reports/AdminAttemptHistory';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {saveReportBlob} from '../../utils/reports';
import {adminRoundCountdown,unallocatedGroups} from '../../utils/adminRoundDetail';
import {configSummary,structureSummary,roundTodos} from '../../utils/adminRoundWorkspace';
import {formatRoundTime} from '../../utils/examRounds';
const topCommittees=async(id,signal)=>{
 let page=1,items=[];while(true){const data=await reportsApi.committees(id,{isTrial:'false',page,limit:100},signal);items.push(...data.items);if(!data.items.length||items.length>=data.pagination.total)break;page++;}
 return items.sort((a,b)=>b.participantCount-a.participantCount||a.partyCommittee.localeCompare(b.partyCommittee,'vi')).slice(0,10);
};
export const AdminRoundOverviewPage=({round,now,onPanel,onQr,statusButton})=>{
 const structure=useStructure(round.id);const [search,setSearch]=useState(''),[person,setPerson]=useState(null);
 const showPeople=round.status!=='DRAFT'||round.summary?.hasAttempts;
 const people=useRoundReport(round.id,{isTrial:'false',limit:10,sort:'latestAt',order:'desc',...(search?{search}:{})},{enabled:Boolean(showPeople),refetchInterval:round.status==='OPEN'?30000:false});
 const questions=useQuestionReport(round.id,{isTrial:'false',limit:5,sort:'correctRate',order:'asc'},{enabled:round.summary?.attemptCount>0,refetchInterval:round.status==='OPEN'?30000:false});
 const committees=useQuery({queryKey:['reports',round.id,'top-committees'],queryFn:({signal})=>topCommittees(round.id,signal),enabled:Boolean(showPeople),refetchInterval:round.status==='OPEN'?30000:false});
 const actions=useReportActions(),feedback=useFeedback();
 const download=async()=>{try{const blob=await actions.exportFile.mutateAsync({id:round.id,params:{isTrial:'false'}});saveReportBlob(blob,`bao-cao-${round.id}.xlsx`);}catch(e){feedback.error(getApiErrorMessage(e));}};
 return <Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card"><Space wrap style={{justifyContent:'space-between',width:'100%'}}><div><Space wrap><Typography.Title level={4} style={{margin:0,overflowWrap:'anywhere'}}>{round.title}</Typography.Title><RoundStatus status={round.status}/></Space><Typography.Paragraph type="secondary" style={{margin:'8px 0 0'}}>{formatRoundTime(round.startAt)} → {formatRoundTime(round.endAt)} · {adminRoundCountdown(round,now)}</Typography.Paragraph></div><Space><Button onClick={onQr}>Mã QR</Button>{statusButton}</Space></Space></Card>
  <Card className="glass-card" title={round.status==='DRAFT'?'Cần làm':'Số liệu chính thức'} extra={round.status!=='DRAFT'&&<Button loading={actions.exportFile.isPending} onClick={download}>Xuất Excel</Button>}>
   {round.status==='DRAFT'?<List dataSource={roundTodos(round,structure.data,now)} locale={{emptyText:'Đủ điều kiện mở đợt'}} renderItem={item=><List.Item><Button type="link" onClick={()=>onPanel(item.panel)}>{item.label}</Button></List.Item>}/>:<Row gutter={[12,16]}>{[['Đang làm','inProgressCount'],['Đã nộp','submittedCount'],['Người tham gia','participantCount'],['Tỷ lệ Đạt','passRate']].map(([title,key])=><Col xs={12} xl={6} key={key}><Statistic title={title} value={round.summary?.[key]??'—'} precision={key==='passRate'?2:0} suffix={key==='passRate'?'%':undefined}/></Col>)}</Row>}
   {round.summary?.attemptCount>0&&<Alert style={{marginTop:16}} type="warning" showIcon title="Đã có người thi: cơ cấu đề bị khóa; sửa câu hỏi chỉ áp dụng cho lượt sau"/>}
  </Card>
  <Card className="glass-card" title="Cấu hình" extra={<Button onClick={()=>onPanel('config')}>Sửa</Button>}><Typography.Paragraph style={{margin:0,overflowWrap:'anywhere'}}>{configSummary(round)}</Typography.Paragraph></Card>
  <Card className="glass-card" title="Cơ cấu đề" extra={<Space wrap><Button onClick={()=>onPanel('structure')}>Sửa</Button><Button disabled={!round.structureSufficient} onClick={()=>onPanel('structure',{preview:'1'})}>Xem thử đề</Button></Space>}>
   {structure.isError?<QueryErrorState error={structure.error} onRetry={()=>structure.refetch()}/>:<><Typography.Paragraph style={{overflowWrap:'anywhere'}}>{structure.isPending?'Đang tải cơ cấu…':structureSummary(structure.data)}</Typography.Paragraph><Typography.Text strong>Tổng: {round.questionCount} câu mỗi đề / {round.totalValidQuestionCount} câu hợp lệ</Typography.Text>{unallocatedGroups(structure.data).length>0&&<Alert type="warning" showIcon title={`${unallocatedGroups(structure.data).length} nghị quyết mới chưa phân bổ`}/>}{structure.data?.locked&&<Typography.Paragraph type="secondary">Cơ cấu đã khóa</Typography.Paragraph>}</>}
  </Card>
  {showPeople&&<><Card className="glass-card" title="Theo đảng bộ" extra={<Button onClick={()=>onPanel('results',{view:'committees'})}>Xem tất cả</Button>}>
   {committees.isError?<QueryErrorState error={committees.error} onRetry={()=>committees.refetch()}/>:<List loading={committees.isFetching} dataSource={committees.data||[]} locale={{emptyText:'Chưa có dữ liệu'}} renderItem={r=><List.Item><Button type="link" className="round-summary-link" onClick={()=>onPanel('results',{view:'people',committeeKey:r.committeeKey,committeeName:r.partyCommittee})}>{r.partyCommittee}: {r.participantCount} tham gia · {r.passedCount} Đạt · {r.passRate}%</Button></List.Item>}/>}
  </Card><Card className="glass-card" title="Người vừa nộp gần nhất" extra={<Button onClick={()=>onPanel('results')}>Xem tất cả</Button>}><Input.Search aria-label="Tìm nhanh người dự thi" placeholder="Tìm tên / đơn vị" allowClear onSearch={setSearch}/>
   {people.isError?<QueryErrorState error={people.error} onRetry={()=>people.refetch()}/>:<List loading={people.isFetching} dataSource={(people.data?.items||[]).filter(p=>p.latestSubmittedAt)} locale={{emptyText:'Chưa có lượt đã nộp'}} renderItem={p=><List.Item><Button type="text" className="round-summary-link" onClick={()=>setPerson(p)}><strong>{p.fullName}</strong> · {p.partyBranch} · {p.bestPercentage??'—'}% · {p.finalResult==='PASSED'?'Đạt':p.finalResult==='FAILED'?'Không đạt':'Chưa hoàn thành'} · {formatRoundTime(p.latestSubmittedAt)}</Button></List.Item>}/>}
  </Card></>}
  <Card className="glass-card" title="Câu hỏi" extra={<Button onClick={()=>onPanel('questions')}>Quản lý câu hỏi</Button>}><Typography.Paragraph>{round.totalValidQuestionCount} câu hợp lệ · {round.groupCount} nghị quyết</Typography.Paragraph>{round.summary?.attemptCount>0&&(questions.isError?<QueryErrorState error={questions.error} onRetry={()=>questions.refetch()}/>:<List header="5 câu có tỷ lệ đúng thấp nhất" dataSource={questions.data?.items||[]} renderItem={q=><List.Item>{q.questionCode} · {q.categoryName} · {q.correctRate}% đúng</List.Item>}/>)}</Card>
  <AdminAttemptHistory key={person?.userId||'closed'} roundId={round.id} participant={person} onClose={()=>setPerson(null)}/>
 </Space>;
};
