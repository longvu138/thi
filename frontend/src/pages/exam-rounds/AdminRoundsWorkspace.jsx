import {useEffect,useState,useRef} from 'react';
import {Link,Navigate,useBlocker,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {App as AntApp,Button,Card,Drawer,Dropdown,Empty,Form,Input,List,Pagination,Space,Spin,Tooltip,Typography} from 'antd';
import {useExamRounds,useExamRound,useExamRoundMutations} from '../../hooks/useExamRounds';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {ROUND_DEFAULTS} from '../../constants/examRounds';
import {roundOpenMissing} from '../../utils/adminRoundDetail';
import {ADMIN_ROUND_DESKTOP_QUERY,isReceiptCode,legacyAdminTarget} from '../../utils/adminRoundWorkspace';
import {receiptsApi} from '../../api/receiptsApi';
import {FormModal} from '../../components/common/FormModal';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {RoundStatusModal} from '../../components/exam-rounds/RoundStatusModal';
import {RoundQrModal} from '../../components/exam-rounds/RoundQrModal';
import {RoundConfigPanel} from '../../components/exam-rounds/RoundConfigPanel';
import {RoundStructure} from '../../components/exam-rounds/RoundStructure';
import {RoundQuestions} from '../../components/questions/RoundQuestions';
import {AttemptReceiptModal} from '../../components/receipts/ReceiptModal';
import {RoundReportPage} from '../reports/RoundReportPage';
import {AdminRoundOverviewPage} from './AdminRoundOverviewPage';
import './round-workspace.css';
import './round-detail.css';
export const LegacyAdminRedirect=({kind})=>{
 const {id}=useParams();const location=useLocation();
 return <Navigate replace to={legacyAdminTarget({id,kind,search:location.search})}/>;
};
export const AdminRoundsWorkspace=()=>{
 const {id}=useParams(),navigate=useNavigate();const [search,setSearch]=useSearchParams();const {modal}=AntApp.useApp();
 const wide=useMediaQuery(ADMIN_ROUND_DESKTOP_QUERY),mobile=useMediaQuery('(max-width:767.98px)');
 const [params,setParams]=useState({page:1,limit:20,status:'OPEN',search:''}),[creating,setCreating]=useState(false),[statusRound,setStatusRound]=useState(null),[qrRound,setQrRound]=useState(null),[now,setNow]=useState(Date.now),[finding,setFinding]=useState(false);
 const dirty=useRef(false);const setDirty=value=>{dirty.current=value;};
 const [form]=Form.useForm();const feedback=useFeedback(),mutations=useExamRoundMutations();
 const list=useExamRounds(params,true,{refetchInterval:30000}),detail=useExamRound(id,true,{refetchInterval:q=>q.state.data?.status==='OPEN'?30000:false});
 const round=detail.data;
 const panel=['config','structure','results','questions'].includes(search.get('panel'))?search.get('panel'):null;
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty.current&&(currentLocation.pathname!==nextLocation.pathname||new URLSearchParams(currentLocation.search).get('panel')!==new URLSearchParams(nextLocation.search).get('panel')));
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(search.has('tab'))navigate(legacyAdminTarget({id,search:search.toString()}),{replace:true});},[id,search,navigate]);
 const changeSearch=update=>setSearch(previous=>{const next=new URLSearchParams(previous);update(next);return next;},{replace:true,preventScrollReset:true});
 const onPanel=(value,extra={})=>changeSearch(next=>{for(const key of ['panel','view','committeeKey','committeeName','preview'])next.delete(key);if(value)next.set('panel',value);for(const [key,val] of Object.entries(extra))next.set(key,val);});
 const select=row=>navigate(`/admin/exam-rounds/${row.id}`,{preventScrollReset:true});
 const remove=async row=>{try{await mutations.remove.mutateAsync(row.id);setDirty(false);if(id===row.id)navigate('/admin/exam-rounds',{replace:true});feedback.success('Đã xóa đợt');}catch(e){feedback.error(getApiErrorMessage(e));}};
 const askRemove=row=>modal.confirm({title:'Xóa đợt và các câu hỏi chưa dùng?',okText:'Xóa',cancelText:'Hủy',onOk:()=>remove(row)});
 const save=async body=>{try{await mutations.update.mutateAsync({id,body});feedback.success('Đã lưu cấu hình');return true;}catch(e){feedback.error(getApiErrorMessage(e));return false;}};
 const create=async({title})=>{try{const row=await mutations.create.mutateAsync({...ROUND_DEFAULTS,title:title.trim()});setCreating(false);form.resetFields();setParams(previous=>({...previous,status:'DRAFT',page:1,search:''}));navigate(`/admin/exam-rounds/${row.id}?panel=config`);}catch(e){feedback.error(getApiErrorMessage(e));}};
 const find=async value=>{
  const text=value.trim();if(!isReceiptCode(text)){setParams(previous=>({...previous,search:text,page:1}));return;}
  setFinding(true);try{const data=await receiptsApi.adminList({code:text,page:1,limit:1});const receipt=data.items?.[0];if(!receipt){feedback.error('Không tìm thấy phiếu với mã này');return;}changeSearch(next=>next.set('receiptAttempt',receipt.attemptId));}catch(e){feedback.error(getApiErrorMessage(e));}finally{setFinding(false);}
 };
 const statusButton=row=>{const missing=roundOpenMissing(row,{},now);return <Tooltip title={row.status!=='OPEN'&&missing.length?missing.join(' · '):undefined}><span><Button type="primary" disabled={mutations.update.isPending||row.status!=='OPEN'&&missing.length>0} onClick={()=>setStatusRound(row)}>{row.status==='OPEN'?'Đóng đợt':'Mở đợt'}</Button></span></Tooltip>;};
 return <div className={`admin-round-workspace ${wide?'is-split':''}`}>
  {(wide||!id)&&<section className="round-workspace-list" aria-label="Danh sách đợt kiểm tra"><Card className="glass-card"><Space orientation="vertical" size={16} className="full-width"><Space wrap style={{width:'100%',justifyContent:'space-between'}}><Typography.Title level={4} style={{margin:0}}>Đợt kiểm tra</Typography.Title><Button type="primary" onClick={()=>setCreating(true)}>Tạo đợt</Button></Space>
   <Space wrap>{[['OPEN','Đang mở'],['DRAFT','Nháp'],['CLOSED','Đã đóng']].map(([status,label])=><Button key={status} type={params.status===status?'primary':'default'} onClick={()=>setParams(previous=>({...previous,status,page:1}))}>{label} ({list.data?.statusCounts?.[status]??0})</Button>)}</Space>
   <Input.Search aria-label="Tìm tên đợt hoặc mã phiếu" placeholder="Tên đợt hoặc mã phiếu" loading={finding} allowClear onSearch={find}/>
   {list.isError&&<QueryErrorState error={list.error} onRetry={()=>list.refetch()}/>}
   <List loading={list.isFetching} dataSource={list.data?.items||[]} locale={{emptyText:'Chưa có đợt phù hợp'}} renderItem={row=><List.Item className={`round-workspace-row ${row.id===id?'is-selected':''}`} onClick={()=>select(row)}><button className="round-row-select" onClick={event=>{event.stopPropagation();select(row);}}><strong>{row.title}</strong><span>{row.status==='DRAFT'?(row.missing?.map(item=>item.label).join(' · ')||'Đủ điều kiện mở đợt'):`${row.summary?.submittedCount||0} đã nộp · ${row.summary?.inProgressCount||0} đang làm · ${row.summary?.passRate||0}% Đạt`}</span></button><div onClick={event=>event.stopPropagation()}><Dropdown trigger={['click']} menu={{items:[{key:'status',label:row.status==='OPEN'?'Đóng đợt':'Mở đợt',disabled:row.status!=='OPEN'&&roundOpenMissing(row,{},now).length>0,onClick:()=>setStatusRound(row)},{key:'qr',label:'Mã QR',onClick:()=>setQrRound(row)},...(!row.summary?.hasAttempts?[{key:'delete',label:'Xóa',danger:true,onClick:()=>askRemove(row)}]:[])]}}><Button aria-label={`Thao tác đợt ${row.title}`}>⋯</Button></Dropdown></div></List.Item>}/>
   <Pagination size="small" current={params.page} pageSize={20} total={list.data?.pagination.total||0} showSizeChanger={false} onChange={page=>setParams(previous=>({...previous,page}))}/>
  </Space></Card></section>}
  {(wide||id)&&<section className="round-workspace-overview" aria-label="Tổng quan đợt">{!wide&&<Link to="/admin/exam-rounds">← Đợt kiểm tra</Link>}{!id?<Card className="glass-card"><Empty description="Chọn một đợt hoặc tạo đợt mới để bắt đầu"/></Card>:detail.isError?<QueryErrorState error={detail.error} onRetry={()=>detail.refetch()}/>:!round?<Spin><Card>Đang tải đợt…</Card></Spin>:<AdminRoundOverviewPage key={id} round={round} now={now} onPanel={onPanel} onQr={()=>setQrRound(round)} statusButton={statusButton(round)}/>}</section>}
  <Drawer title={{config:'Sửa cấu hình',structure:'Cơ cấu đề',results:'Kết quả',questions:'Quản lý câu hỏi'}[panel]} open={Boolean(panel&&round)} onClose={()=>onPanel(null)} width={mobile?'100%':'min(1180px, calc(100vw - 40px))'} destroyOnHidden className="admin-round-panel" styles={{body:{overflowY:'auto'}}}>
   {round&&panel==='config'&&<RoundConfigPanel key={id} round={round} busy={mutations.update.isPending} onSave={save} onDelete={()=>remove(round)} onDirty={setDirty}/>}
   {round&&panel==='structure'&&<RoundStructure key={id} roundId={id} previewOnOpen={search.get('preview')==='1'}/>}
   {round&&panel==='questions'&&<RoundQuestions key={id} roundId={id} onStructure={()=>onPanel('structure')}/>}
   {round&&panel==='results'&&<RoundReportPage key={`${id}:${search.get('view')}:${search.get('committeeKey')}`} embedded roundId={id} initialView={['people','committees','questions'].includes(search.get('view'))?search.get('view'):'people'} initialCommittee={search.get('committeeKey')} initialCommitteeName={search.get('committeeName')||''}/>}
  </Drawer>
  <FormModal title="Tạo đợt kiểm tra" open={creating} onCancel={()=>setCreating(false)} busy={mutations.create.isPending} width={520} footer={<Button type="primary" loading={mutations.create.isPending} onClick={()=>form.submit()}>Tạo đợt</Button>}><Form form={form} layout="vertical" onFinish={create}><Form.Item name="title" label="Tên đợt" rules={[{required:true,whitespace:true,message:'Nhập tên đợt'},{max:255}]}><Input autoFocus/></Form.Item></Form></FormModal>
  <RoundStatusModal round={statusRound} busy={mutations.update.isPending} onCancel={()=>setStatusRound(null)} onConfirm={async()=>{if(statusRound.status!=='OPEN'){const missing=roundOpenMissing(statusRound,{},Date.now());if(missing.length){feedback.error(missing.join(' · '));setStatusRound(null);return;}}try{await mutations.update.mutateAsync({id:statusRound.id,body:{status:statusRound.status==='OPEN'?'CLOSED':'OPEN'}});setStatusRound(null);}catch(e){feedback.error(getApiErrorMessage(e));}}}/>
  <RoundQrModal key={qrRound?.id||'closed'} round={qrRound} onClose={()=>setQrRound(null)}/>
  <AttemptReceiptModal admin attemptId={search.get('receiptAttempt')} open={Boolean(search.get('receiptAttempt'))} onClose={()=>changeSearch(next=>next.delete('receiptAttempt'))}/>
  <FormModal title="Bỏ thay đổi chưa lưu?" width={440} open={blocker.state==='blocked'} onCancel={()=>blocker.reset?.()} footer={<Space><Button onClick={()=>blocker.reset?.()}>Tiếp tục sửa</Button><Button danger onClick={()=>{setDirty(false);blocker.proceed?.();}}>Bỏ thay đổi</Button></Space>}>Cấu hình có thay đổi chưa lưu.</FormModal>
 </div>;
};
