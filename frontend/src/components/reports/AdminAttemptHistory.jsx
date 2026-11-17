import {AttemptReceiptModal} from '../receipts/ReceiptModal';
import {useState} from 'react';
import {Alert,Button,Card,Descriptions,Pagination,Space,Spin,Table,Tag,Typography} from 'antd';
import {useAdminHistory,useAdminAttempt} from '../../hooks/useReports';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {FormModal} from '../common/FormModal';
import {QueryErrorState} from '../common/QueryErrorState';
import {AttemptSnapshotQuestions} from '../attempts/AttemptSnapshotQuestions';
import {formatRoundTime} from '../../utils/examRounds';
import {resultLabel,durationLabel} from '../../utils/results';
export const AdminAttemptHistory=({roundId,participant=null,onClose})=>{
 const [receiptId,setReceiptId]=useState(null);
 const [page,setPage]=useState({page:1,limit:20}),[attemptId,setAttemptId]=useState(null);
 const history=useAdminHistory(roundId,participant?.userId,page),detail=useAdminAttempt(attemptId);const compact=useMediaQuery('(max-width:1199.98px)');
 const rows=Array.isArray(history.data?.items)?history.data.items:[];const attempt=detail.data;
 const columns=[{title:'Lượt',dataIndex:'attemptNumber'},{title:'Loại',dataIndex:'isTrial',render:value=><Tag color={value?'gold':'blue'}>{value?'Chạy thử':'Chính thức'}</Tag>},{title:'Trạng thái',dataIndex:'status',render:resultLabel},{title:'Điểm (%)',dataIndex:'percentage',render:value=>value??'Chưa chốt'},{title:'Kết quả',dataIndex:'result',render:resultLabel},{title:'Bắt đầu',dataIndex:'startedAt',render:formatRoundTime},{title:'Thao tác',key:'actions',render:(_,row)=><Space><Button onClick={()=>setAttemptId(row.id)}>Chi tiết</Button>{row.status!=='IN_PROGRESS'&&<Button onClick={()=>setReceiptId(row.id)}>Phiếu</Button>}</Space>}];
 return <FormModal title={`Lịch sử lượt thi: ${participant?.fullName||''}`} open={Boolean(participant)} onCancel={onClose} width={1100} footer={<Button onClick={onClose}>Đóng</Button>}>
  <Space orientation="vertical" size={16} className="full-width">
   <Alert type="info" showIcon title="Chỉ xem dữ liệu đã ghi nhận" description="Đáp án đúng lấy từ snapshot của lượt thi. Màn này không sửa đáp án, không chấm lại hoặc thay đổi trạng thái lượt."/>
   {attemptId?<><Button onClick={()=>setAttemptId(null)}>Về danh sách lượt</Button>{detail.isError&&<QueryErrorState error={detail.error} onRetry={()=>detail.refetch()}/>}<Spin spinning={detail.isFetching}>{attempt&&<><Typography.Title level={5}>{attempt.title}</Typography.Title><Descriptions column={compact?1:3} items={[{key:'mode',label:'Loại',children:attempt.isTrial?'Chạy thử':'Chính thức'},{key:'status',label:'Trạng thái',children:resultLabel(attempt.status)},{key:'count',label:'Câu đúng',children:attempt.correctCount??'Chưa chốt'},{key:'score',label:'Điểm (%)',children:attempt.percentage??'Chưa chốt'},{key:'start',label:'Bắt đầu',children:formatRoundTime(attempt.startedAt)},{key:'end',label:'Kết thúc',children:formatRoundTime(attempt.submittedAt)},{key:'time',label:'Thời gian',children:durationLabel(attempt.durationSeconds)}]}/><AttemptSnapshotQuestions questions={attempt.questions} reveal/></>}</Spin></>:<>
    {history.isError&&<QueryErrorState error={history.error} onRetry={()=>history.refetch()}/>}
    {compact?<Spin spinning={history.isFetching}><Space orientation="vertical" className="full-width">{!rows.length&&<Card>Chưa có lượt thi</Card>}{rows.map(row=><Card key={row.id}>{columns.map(column=><div key={column.dataIndex||column.key} style={{marginBottom:8}}><Typography.Text type="secondary">{column.title}: </Typography.Text>{column.render?column.render(row[column.dataIndex],row):row[column.dataIndex]}</div>)}</Card>)}</Space></Spin>:<Table rowKey="id" loading={history.isFetching} dataSource={rows} columns={columns} pagination={false} scroll={{x:900}}/>}
    <Pagination current={page.page} pageSize={page.limit} total={history.data?.pagination?.total||0} onChange={(page,limit)=>setPage({page,limit})}/>
   </>}
  <AttemptReceiptModal admin attemptId={receiptId} open={Boolean(receiptId)} onClose={()=>setReceiptId(null)}/>
  </Space>
 </FormModal>;
};
