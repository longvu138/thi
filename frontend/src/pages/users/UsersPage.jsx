import {FormModal} from '../../components/common/FormModal';
import {UserImportModal} from '../../components/users/UserImportModal';
import {useState} from 'react';
import {Button,Card,Form,Input,Select,Space,Switch,Table,Tag,Typography,Pagination,Popconfirm,Alert,Spin} from 'antd';
import {useUsers,useUserMutations} from '../../hooks/useUsers';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {passwordPolicyRule} from '../../utils/passwordPolicy';
import {userPayload} from '../../utils/users';
import {getRoleLabel} from '../../constants/roles';
export const UsersPage = ({currentUser}) => {
 const [params,setParams]=useState({page:1,limit:20,search:''});
 const [importOpen,setImportOpen]=useState(false);
 const [editing,setEditing]=useState(null);
 const [form]=Form.useForm();
 const query=useUsers(params); const mutations=useUserMutations(); const feedback=useFeedback();
 const compact=useMediaQuery('(max-width: 1199.98px)');
 const busy=mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;
 const download=async()=>{try {const blob=await mutations.template.mutateAsync();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="mau-tai-khoan.xlsx";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){feedback.error(getApiErrorMessage(error));}};
 const run=async action=>{try {await action(); feedback.success('Đã cập nhật tài khoản'); return true;} catch(error){feedback.error(getApiErrorMessage(error)); return false;}};
 const open=row=>{setEditing(row || {}); form.resetFields(); form.setFieldsValue(row ? {fullName:row.fullName,role:row.role,isActive:row.isActive} : {role:'USER',isActive:true});};
 const save=async values=>{const body=userPayload(values); if(await run(()=>editing.id ? mutations.update.mutateAsync({id:editing.id,body}) : mutations.create.mutateAsync(body))) setEditing(null);};
 const actions=row=><Space wrap>
  <Button onClick={()=>open(row)}>Sửa</Button>
  <Popconfirm title={row.isActive ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'} onConfirm={()=>run(()=>mutations.update.mutateAsync({id:row.id,body:{isActive:!row.isActive}}))}>
   <Button disabled={busy || row.id===currentUser?.id}>{row.isActive?'Khóa':'Mở khóa'}</Button>
  </Popconfirm>
  <Popconfirm title="Xóa tài khoản này?" description="Lịch sử thi vẫn được giữ lại." onConfirm={()=>run(()=>mutations.remove.mutateAsync(row.id))}>
   <Button danger disabled={busy || row.id===currentUser?.id}>Xóa</Button>
  </Popconfirm>
 </Space>;
 const rows=query.data?.items || []; const pagination=query.data?.pagination || {total:0};
 return <Space orientation="vertical" size={16} className="full-width">
  <Card className="glass-card"><Space wrap style={{width:'100%',justifyContent:'space-between'}}>
   <Typography.Title level={4} style={{margin:0}}>Quản lý tài khoản</Typography.Title>
   <Space wrap><Button loading={mutations.template.isPending} onClick={download}>Tải Excel mẫu</Button><Button onClick={()=>setImportOpen(true)}>Import Excel</Button><Button type="primary" onClick={()=>open()}>Thêm tài khoản</Button></Space>
  </Space><Input.Search style={{marginTop:16,maxWidth:420}} allowClear placeholder="Tìm tài khoản, họ tên" onSearch={search=>setParams({...params,search,page:1})}/></Card>
  {query.isError && <Alert type="error" showIcon title="Không tải được danh sách tài khoản" description={getApiErrorMessage(query.error)} action={<Button onClick={()=>query.refetch()}>Thử lại</Button>}/>}
  {compact ? <Spin spinning={query.isFetching}><Space orientation="vertical" className="full-width">
   {!rows.length && !query.isLoading && <Card>Chưa có tài khoản phù hợp</Card>}
   {rows.map(row=><Card className="glass-card" key={row.id} title={row.fullName}>
    <p>{row.isParticipant ? "Người dự thi" : row.username} · {getRoleLabel(row.role)}</p>{row.isParticipant && <p>Đảng bộ: {row.partyCommittee}<br/>Chi bộ: {row.partyBranch}</p>}<p><Tag color={row.isActive?'green':'default'}>{row.isActive?'Hoạt động':'Đã khóa'}</Tag></p>{actions(row)}
   </Card>)}
  </Space></Spin> : <Card className="glass-card"><Table rowKey="id" loading={query.isFetching} dataSource={rows} pagination={false} columns={[
   {title:'Tài khoản',dataIndex:'username',render:(value,row)=>row.isParticipant?'Người dự thi':value},{title:'Họ tên',dataIndex:'fullName',render:(value,row)=><><div>{value}</div>{row.isParticipant && <small>{row.partyCommittee} · {row.partyBranch}</small>}</>},
   {title:'Vai trò',dataIndex:'role',render:getRoleLabel},
   {title:'Trạng thái',dataIndex:'isActive',render:value=><Tag color={value?'green':'default'}>{value?'Hoạt động':'Đã khóa'}</Tag>},
   {title:'Thao tác',render:(_,row)=>actions(row)},
  ]}/></Card>}
  <Pagination current={params.page} pageSize={params.limit} total={pagination.total} showSizeChanger onChange={(page,limit)=>setParams({...params,page,limit})}/>
  <UserImportModal open={importOpen} compact={compact} mutation={mutations.import} onClose={()=>setImportOpen(false)} onSuccess={count=>feedback.success(`Đã nhập ${count} tài khoản`)}/>
  <FormModal title={editing?.id?'Sửa tài khoản':'Thêm tài khoản'} open={editing!==null} onCancel={()=>setEditing(null)} busy={busy} width={760} footer={<Space><Button disabled={busy} onClick={()=>setEditing(null)}>Hủy</Button><Button type="primary" loading={busy} onClick={()=>form.submit()}>Lưu</Button></Space>}>
   <Form className="form-modal-grid" form={form} layout="vertical" onFinish={save}>
    {!editing?.id && <Form.Item name="username" label="Tài khoản" rules={[{required:true,message:'Vui lòng nhập tài khoản'},{pattern:/^[a-zA-Z0-9_.-]{3,64}$/,message:'Nhập 3–64 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang'}]}><Input autoComplete="off"/></Form.Item>}
    <Form.Item name="fullName" label="Họ tên" rules={[{required:true,whitespace:true,message:'Vui lòng nhập họ tên'},{max:255,message:'Họ tên không quá 255 ký tự'}]}><Input/></Form.Item>
    <Form.Item name="role" label="Vai trò" rules={[{required:true,message:'Vui lòng chọn vai trò'}]}><Select disabled={editing?.isParticipant} options={[{value:'ADMIN',label:'Quản trị viên'},{value:'USER',label:'Người dùng'}]}/></Form.Item>
    <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch disabled={editing?.id===currentUser?.id}/></Form.Item>
    {!editing?.isParticipant && <Form.Item className="form-span-all" name="password" label={editing?.id?'Mật khẩu mới (để trống để giữ nguyên)':'Mật khẩu'} dependencies={['username']} rules={[{required:!editing?.id,message:'Vui lòng nhập mật khẩu'},passwordPolicyRule(()=>editing?.username || form.getFieldValue('username'))]}><Input.Password autoComplete="new-password"/></Form.Item>}
   </Form>
  </FormModal>
 </Space>;
};
