import {useState} from 'react';
import {Button,Card,Input,Pagination,Popconfirm,Select,Space,Spin,Table,Tag,Typography} from 'antd';
import {useQuestions,useQuestionCategories,useQuestionMutations} from '../../hooks/useQuestions';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {QueryErrorState} from '../../components/common/QueryErrorState';
import {QuestionFormModal} from '../../components/questions/QuestionFormModal';
import {QuestionImportModal} from '../../components/questions/QuestionImportModal';
export const RoundQuestions=({roundId,questionCount})=>{
 const [params,setParams]=useState({page:1,limit:20,search:'',category:undefined});
 const [categorySearch,setCategorySearch]=useState('');const [categoryPage,setCategoryPage]=useState(1);
 const [editing,setEditing]=useState(null);const [importOpen,setImportOpen]=useState(false);
 const query=useQuestions(roundId,params);const categories=useQuestionCategories(roundId,{search:categorySearch,page:categoryPage,limit:100});
 const mutations=useQuestionMutations(roundId);const feedback=useFeedback();const compact=useMediaQuery('(max-width: 1199.98px)');
 const busy=mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;
 const save=async body=>{try {if(editing?.id)await mutations.update.mutateAsync({id:editing.id,body});else await mutations.create.mutateAsync(body);setEditing(null);feedback.success('Đã lưu câu hỏi');}catch(error){feedback.error(getApiErrorMessage(error));}};
 const remove=async id=>{try {await mutations.remove.mutateAsync(id);feedback.success('Đã xóa câu hỏi');}catch(error){feedback.error(getApiErrorMessage(error));}};
 const download=async(exporting=false)=>{try {const blob=await (exporting?mutations.export:mutations.template).mutateAsync();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=exporting?'cau-hoi.xlsx':'mau-cau-hoi.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){feedback.error(getApiErrorMessage(error));}};
 const actions=row=><Space wrap><Button disabled={busy} onClick={()=>setEditing(row)}>Xem / Sửa</Button><Popconfirm title="Xóa / vô hiệu hóa câu hỏi này?" description="Câu chưa dùng sẽ xóa hẳn; câu đã vào đề chỉ vô hiệu hóa. Lịch sử được giữ nguyên." onConfirm={()=>remove(row.id)}><Button danger disabled={busy}>Xóa / Vô hiệu hóa</Button></Popconfirm></Space>;
 const rows=query.data?.items || [];const pagination=query.data?.pagination || {total:0};
 return <Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card"><Space wrap style={{width:'100%',justifyContent:'space-between'}}><Typography.Title level={4} style={{margin:0}}>Câu hỏi</Typography.Title><Space wrap><Button loading={mutations.template.isPending} onClick={()=>download()}>Tải Excel mẫu</Button><Button loading={mutations.export.isPending} onClick={()=>download(true)}>Xuất Excel</Button><Button onClick={()=>setImportOpen(true)}>Import Excel</Button><Button type="primary" onClick={()=>setEditing({})}>Thêm câu hỏi</Button></Space></Space>
   <Typography.Paragraph style={{marginTop:16}}>Số câu hợp lệ: {query.data?.validCount ?? 0} / {questionCount ?? 0} câu mỗi bài</Typography.Paragraph>
   <Space wrap style={{marginTop:16,width:'100%'}}><Input.Search allowClear placeholder="Tìm mã, nội dung câu hỏi" style={{width:compact?'min(100%, 320px)':320}} onSearch={search=>setParams({...params,search,page:1})}/><Select allowClear showSearch filterOption={false} placeholder="Tất cả nhóm" style={{width:250,maxWidth:'100%'}} loading={categories.isFetching} value={params.category} options={(categories.data?.items || []).map(item=>({value:item.id,label:item.name}))} onSearch={search=>{setCategorySearch(search);setCategoryPage(1);}} onChange={category=>setParams({...params,category,page:1})}/>
   {(categories.data?.pagination.total || 0)>100 && <Pagination size="small" current={categoryPage} pageSize={100} total={categories.data.pagination.total} showSizeChanger={false} onChange={setCategoryPage}/>}</Space>
  </Card>
  {categories.isError && <QueryErrorState title="Không tải được nhóm câu hỏi" error={categories.error} onRetry={()=>categories.refetch()}/>}
  {query.isError && <QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>}
  {compact?<Spin spinning={query.isFetching}><Space orientation="vertical" className="full-width">{!rows.length && !query.isLoading && <Card>Chưa có câu hỏi phù hợp</Card>}{rows.map(row=><Card className="glass-card" key={row.id} title={row.questionCode}><Tag>{row.category}</Tag><Typography.Paragraph style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:12}}>{row.content}</Typography.Paragraph><p>Đáp án đúng: <strong>{row.correctAnswer}</strong></p><p>Xáo trộn lựa chọn: {row.allowShuffleOptions?'Có':'Không'}</p>{actions(row)}</Card>)}</Space></Spin>:<Card className="glass-card"><Table rowKey="id" loading={query.isFetching} dataSource={rows} pagination={false} tableLayout="fixed" columns={[{title:'Mã',dataIndex:'questionCode',width:150},{title:'Nhóm',dataIndex:'category',width:180},{title:'Nội dung',dataIndex:'content',ellipsis:true},{title:'Đáp án đúng',dataIndex:'correctAnswer',width:110},{title:'Xáo trộn',dataIndex:'allowShuffleOptions',width:110,render:value=>value?'Có':'Không'},{title:'Thao tác',width:310,render:(_,row)=>actions(row)}]}/></Card>}
  <Pagination current={params.page} pageSize={params.limit} total={pagination.total} showSizeChanger onChange={(page,limit)=>setParams({...params,page,limit})}/>
  <QuestionFormModal editing={editing} busy={busy} compact={compact} onClose={()=>setEditing(null)} onSave={save}/>
  <QuestionImportModal open={importOpen} compact={compact} mutation={mutations.import} onClose={()=>setImportOpen(false)} onSuccess={count=>feedback.success(`Đã nhập ${count} câu hỏi`)}/>
 </Space>;
};
