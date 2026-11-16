import {RoundStatusModal} from '../../components/exam-rounds/RoundStatusModal';
import {ParticipationSummary} from '../../components/exam-rounds/ParticipationSummary';
import {RoundQrModal} from '../../components/exam-rounds/RoundQrModal';
import {StartAttemptButton} from '../../components/attempts/StartAttemptButton';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, Pagination, Popconfirm, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { useExamRounds, useExamRoundMutations } from '../../hooks/useExamRounds';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useFeedback } from '../../hooks/useFeedback';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatRoundTime, roundWindowLabel, roundListParams,sortParticipantRounds } from '../../utils/examRounds';
import { ROUND_STATUSES } from '../../constants/examRounds';
import { QueryErrorState } from '../../components/common/QueryErrorState';
import { ExamRoundFormModal } from '../../components/exam-rounds/ExamRoundFormModal';
import { RoundStatus } from '../../components/exam-rounds/ExamRoundSummary';
export const ExamRoundsPage = ({ admin = false }) => {
 const [params, setParams] = useState({ page: 1, limit: 20, search: '', status: undefined });
 const [editing, setEditing] = useState(null);
 const [qrRound,setQrRound] = useState(null);
 const [statusRound,setStatusRound]=useState(null);
 const query = useExamRounds(roundListParams(params,admin), admin);
 const mutations = useExamRoundMutations(); const feedback = useFeedback();
 const compact = useMediaQuery('(max-width: 1199.98px)');
 const busy = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;
 const base = admin ? '/admin/exam-rounds' : '/exam-rounds';
 const save = async body => {
  try {
   if (editing?.id) await mutations.update.mutateAsync({ id: editing.id, body }); else await mutations.create.mutateAsync(body);
   setEditing(null); feedback.success('Đã lưu đợt kiểm tra');
  } catch (error) { feedback.error(getApiErrorMessage(error)); }
 };
 const remove = async id => {
  try { await mutations.remove.mutateAsync(id); feedback.success('Đã xóa đợt kiểm tra'); }
  catch (error) { feedback.error(getApiErrorMessage(error)); }
 };
 const changeStatus=async(row,status)=>{try{await mutations.update.mutateAsync({id:row.id,body:{status}});feedback.success(status==='OPEN'?'Đã mở đợt':'Đã đóng đợt');setStatusRound(null);}catch(error){feedback.error(getApiErrorMessage(error));}};
 const actions = row => <Space wrap>
  {!admin && <><StartAttemptButton round={row}/></>}
  <Link to={`${base}/${row.id}`}><Button>Xem chi tiết</Button></Link>
  {admin && <><Button onClick={()=>setQrRound(row)}>Mã QR</Button><Button disabled={busy} onClick={()=>setStatusRound(row)}>{row.status==='OPEN'?'Đóng đợt':'Mở đợt'}</Button><Link to={`${base}/${row.id}/reports`}><Button>Báo cáo</Button></Link><Button disabled={busy} onClick={() => setEditing(row)}>Sửa</Button><Popconfirm title="Xóa đợt kiểm tra này?" description="Chỉ xóa được đợt chưa có lượt thi." onConfirm={() => remove(row.id)}><Button danger disabled={busy}>Xóa</Button></Popconfirm></>}
 </Space>;
 const items=query.data?.items || [];const rows = admin?items:sortParticipantRounds(items); const pagination = query.data?.pagination || { total: 0 };
 return <Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card">
   <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}><Typography.Title level={4} style={{ margin: 0 }}>{admin ? 'Quản lý đợt kiểm tra' : 'Đợt kiểm tra'}</Typography.Title>{admin && <Button type="primary" onClick={() => setEditing({})}>Tạo đợt kiểm tra</Button>}</Space>
   <Space wrap style={{ marginTop: 16, width: '100%' }}><Input.Search allowClear placeholder="Tìm tên đợt kiểm tra" style={{ width: compact ? 260 : 320, maxWidth: '100%' }} onSearch={search => setParams({ ...params, search, page: 1 })}/>{admin && <Select allowClear placeholder="Tất cả trạng thái" style={{ width: 200, maxWidth: '100%' }} value={params.status} options={ROUND_STATUSES.filter(item => admin || item.value !== 'DRAFT')} onChange={status => setParams({ ...params, status, page: 1 })}/>}</Space>
  </Card>
  {query.isError && <QueryErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching}/>}
  {compact ? <Spin spinning={query.isFetching}><Space orientation="vertical" className="full-width">
   {!rows.length && !query.isLoading && <Card>Chưa có đợt kiểm tra phù hợp</Card>}
   {rows.map(row => <Card key={row.id} className="glass-card"><Typography.Title level={5} style={{ marginTop: 0, overflowWrap: 'anywhere' }}>{row.title}</Typography.Title><Space wrap><RoundStatus status={row.status}/><Typography.Text>{roundWindowLabel(row)}</Typography.Text></Space><p>{row.questionCount} câu · {row.durationMinutes} phút · Tối đa {row.maxAttempts} lượt</p><p>Ngưỡng đạt: {row.passingPercentage}%</p><p>Bắt đầu: {formatRoundTime(row.startAt)}</p><p>Kết thúc: {formatRoundTime(row.endAt)}</p>{admin?<Tag color={row.structureSufficient===false||row.validQuestionCount<row.questionCount?'red':'green'}>Câu hợp lệ: {row.validQuestionCount} / {row.questionCount}</Tag>:<ParticipationSummary participation={row.participation}/>}<div style={{marginTop:12}}>{actions(row)}</div></Card>)}
  </Space></Spin> : <Card className="glass-card"><Table rowKey="id" tableLayout="fixed" loading={query.isFetching} dataSource={rows} pagination={false} scroll={{x:admin?1300:1200}} columns={[
   { title: 'Đợt kiểm tra', dataIndex: 'title', ellipsis: true },
   { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (status,row) => <Space orientation="vertical" size={4}><RoundStatus status={status}/>{roundWindowLabel(row)==='Chạy thử'&&<Tag color="gold">Chạy thử</Tag>}</Space> },
   { title: 'Cấu hình', width: 170, render: (_, row) => `${row.questionCount} câu / ${row.durationMinutes} phút / ${row.maxAttempts} lượt` },
   { title: 'Kết thúc (giờ Việt Nam)', dataIndex: 'endAt', width: 180, render: formatRoundTime },
   admin?{title:'Câu hợp lệ / số câu mỗi bài',width:180,render:(_,row)=><Tag color={row.structureSufficient===false||row.validQuestionCount<row.questionCount?'red':'green'}>{row.validQuestionCount} / {row.questionCount}</Tag>}:{title:'Trạng thái tham gia',width:240,render:(_,row)=><ParticipationSummary participation={row.participation}/>},
   { title: 'Thao tác', width: admin?400:250, render: (_, row) => actions(row) },
  ]}/></Card>}
  <Pagination current={params.page} pageSize={params.limit} total={pagination.total} showSizeChanger onChange={(page, limit) => setParams({ ...params, page, limit })}/>
  {admin&&<RoundStatusModal round={statusRound} busy={busy} onCancel={()=>setStatusRound(null)} onConfirm={()=>changeStatus(statusRound,statusRound.status==='OPEN'?'CLOSED':'OPEN')}/>}
  {admin && <RoundQrModal key={qrRound?.id || 'closed'} round={qrRound} onClose={()=>setQrRound(null)}/>}
  {admin && <ExamRoundFormModal editing={editing} compact={compact} busy={busy} onClose={() => setEditing(null)} onSave={save}/>}
 </Space>;
};
