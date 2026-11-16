import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Pagination, Space, Spin, Table, Tag, Typography } from 'antd';
import { useMyResults } from '../../hooks/useResults';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { formatRoundTime } from '../../utils/examRounds';
import { resultLabel } from '../../utils/results';
const Status=({value})=><Tag color={['PASS','PASSED'].includes(value)?'green':['FAIL','FAILED'].includes(value)?'red':'default'}>{resultLabel(value)}</Tag>;
const ResultsList=({examRoundId})=>{
 const [page,setPage]=useState({page:1,limit:20});const query=useMyResults({...page,...(examRoundId?{examRoundId}:{})});
 const compact=useMediaQuery('(max-width: 1199.98px)');const rows=query.data?.items||[];const summary=query.data?.summary;
 const action=row=><Link to={examRoundId?(row.status==='IN_PROGRESS'?`/attempts/${row.id}`:`/attempts/${row.id}/result`):`/my-results?examRoundId=${row.examRoundId}`}><Button>{examRoundId?(row.status==='IN_PROGRESS'?'Tiếp tục':'Xem kết quả'):'Xem lịch sử'}</Button></Link>;
 const info=row=>examRoundId?<Space wrap><Tag>Lượt {row.attemptNumber}</Tag>{row.isTrial&&<Tag color="gold">Chạy thử</Tag>}<Status value={row.result||row.status}/>{row.percentage!==null&&<span>{row.percentage}%</span>}</Space>:<Space wrap><Status value={row.finalResult}/><span>{row.usedAttempts}/{row.maxAttempts} lượt chính thức đã dùng</span></Space>;
 return <Space orientation="vertical" size={16} className="full-width"><Card className="glass-card"><Typography.Title level={4} style={{marginTop:0,overflowWrap:'anywhere'}}>{summary?.title||'Lịch sử cá nhân'}</Typography.Title>{summary&&<Space wrap><Status value={summary.finalResult}/><span>{summary.usedAttempts}/{summary.maxAttempts} lượt chính thức đã dùng</span></Space>}{examRoundId&&<p><Link to="/my-results">Tất cả đợt kiểm tra</Link></p>}<Typography.Paragraph type="secondary" style={{marginBottom:0}}>Kết quả cuối chỉ tính lượt chính thức. Lượt chạy thử được giữ riêng trong lịch sử.</Typography.Paragraph></Card>
 {query.isError&&<QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>}
 {compact?<Spin spinning={query.isFetching}><Space orientation="vertical" className="full-width">{!rows.length&&!query.isLoading&&<Card>Chưa có dữ liệu</Card>}{rows.map(row=><Card className="glass-card" key={row.id||row.examRoundId}><Typography.Title level={5} style={{marginTop:0,overflowWrap:'anywhere'}}>{row.title}</Typography.Title>{info(row)}{examRoundId&&<p>Bắt đầu: {formatRoundTime(row.startedAt)}</p>}<div style={{marginTop:12}}>{action(row)}</div></Card>)}</Space></Spin>:<Card className="glass-card"><Table rowKey={examRoundId?'id':'examRoundId'} tableLayout="fixed" dataSource={rows} loading={query.isFetching} pagination={false} columns={[
 {title:'Đợt kiểm tra',dataIndex:'title',ellipsis:true},{title:examRoundId?'Lượt thi':'Kết quả cuối',width:310,render:(_,row)=>info(row)},
 ...(examRoundId?[{title:'Bắt đầu (giờ Việt Nam)',dataIndex:'startedAt',width:190,render:formatRoundTime}]:[]),{title:'Thao tác',width:150,render:(_,row)=>action(row)},
 ]}/></Card>}
 <Pagination current={page.page} pageSize={page.limit} total={query.data?.pagination?.total||0} showSizeChanger onChange={(next,limit)=>setPage({page:next,limit})}/></Space>;
};
export const MyResultsPage=()=>{const [search]=useSearchParams();const id=search.get('examRoundId')||'';return <ResultsList key={id} examRoundId={id}/>;};
