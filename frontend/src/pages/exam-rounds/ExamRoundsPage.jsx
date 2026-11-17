import {ParticipationSummary} from '../../components/exam-rounds/ParticipationSummary';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Button,Card,Input,Pagination,Space,Spin,Table,Tag,Typography} from 'antd';
import {useExamRounds} from '../../hooks/useExamRounds';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {formatRoundTime,roundWindowLabel,roundListParams,sortParticipantRounds} from '../../utils/examRounds';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {RoundStatus} from '../../components/exam-rounds/ExamRoundSummary';
export const ExamRoundsPage=()=>{
 const [params,setParams]=useState({page:1,limit:20,search:''});
 const query=useExamRounds(roundListParams(params));const compact=useMediaQuery('(max-width:1199.98px)');
 const rows=sortParticipantRounds(query.data?.items||[]),pagination=query.data?.pagination||{total:0};
 const actions=row=><Space wrap><StartAttemptButton round={row}/><Link to={`/exam-rounds/${row.id}`}><Button>Xem chi tiết</Button></Link></Space>;
 return <Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card"><Typography.Title level={4} style={{margin:0}}>Đợt kiểm tra</Typography.Title><Input.Search allowClear placeholder="Tìm tên đợt kiểm tra" style={{marginTop:16,width:compact?260:320,maxWidth:'100%'}} onSearch={search=>setParams({...params,search,page:1})}/></Card>
  {query.isError&&<QueryErrorState error={query.error} onRetry={()=>query.refetch()} retrying={query.isFetching}/>}
  {compact?<Spin spinning={query.isFetching}><Space orientation="vertical" className="full-width">
   {!rows.length&&!query.isLoading&&<Card>Chưa có đợt kiểm tra phù hợp</Card>}
   {rows.map(row=><Card key={row.id} className="glass-card"><Typography.Title level={5} style={{marginTop:0,overflowWrap:'anywhere'}}>{row.title}</Typography.Title><Space wrap><RoundStatus status={row.status}/><Typography.Text>{roundWindowLabel(row)}</Typography.Text></Space><p>{row.questionCount} câu · {row.durationMinutes} phút · Tối đa {row.maxAttempts} lượt</p><p>Ngưỡng đạt: {row.passingPercentage}%</p><p>Bắt đầu: {formatRoundTime(row.startAt)}</p><p>Kết thúc: {formatRoundTime(row.endAt)}</p><ParticipationSummary participation={row.participation}/><div style={{marginTop:12}}>{actions(row)}</div></Card>)}
  </Space></Spin>:<Card className="glass-card"><Table rowKey="id" tableLayout="fixed" loading={query.isFetching} dataSource={rows} pagination={false} scroll={{x:1200}} columns={[
   {title:'Đợt kiểm tra',dataIndex:'title',ellipsis:true},
   {title:'Trạng thái',dataIndex:'status',width:150,render:(status,row)=><Space orientation="vertical" size={4}><RoundStatus status={status}/>{roundWindowLabel(row)==='Chạy thử'&&<Tag color="gold">Chạy thử</Tag>}</Space>},
   {title:'Cấu hình',width:170,render:(_,row)=>`${row.questionCount} câu / ${row.durationMinutes} phút / ${row.maxAttempts} lượt`},
   {title:'Kết thúc (giờ Việt Nam)',dataIndex:'endAt',width:180,render:formatRoundTime},
   {title:'Trạng thái tham gia',width:240,render:(_,row)=><ParticipationSummary participation={row.participation}/>},
   {title:'Thao tác',width:250,render:(_,row)=>actions(row)},
  ]}/></Card>}
  <Pagination current={params.page} pageSize={params.limit} total={pagination.total} showSizeChanger onChange={(page,limit)=>setParams({...params,page,limit})}/>
 </Space>;
};
