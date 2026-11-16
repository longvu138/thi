import {FormModal} from '../common/FormModal';
import {useState} from 'react';
import {Alert,Button,Card,Popconfirm,Space,Table,Typography,Upload} from 'antd';
import {canCommitPreview} from '../../utils/questions';
import {getApiErrorMessage} from '../../utils/apiError';
export const QuestionImportModal=({open=false,compact=false,mutation,onClose,onSuccess})=>{
 const [file,setFile]=useState(null);const [preview,setPreview]=useState(null);const [error,setError]=useState('');
 const busy=mutation.isPending;
 const reset=()=>{setFile(null);setPreview(null);setError('');onClose();};
 const run=async mode=>{
  setError('');
  try {const result=await mutation.mutateAsync({file,mode,previewToken:preview?.previewToken});if(mode==='preview')setPreview(result);else {onSuccess(result.importedCount);reset();}}
  catch(err){setError(getApiErrorMessage(err));if(mode==='commit')setPreview(null);}
 };
 const renderRow=row=><Space orientation="vertical" style={{width:'100%',overflowWrap:'anywhere'}}><Typography.Text strong>{row.data.questionCode || 'Chưa có mã'} · {row.data.category}</Typography.Text><Typography.Paragraph style={{whiteSpace:'pre-wrap',margin:0}}>{row.data.content}</Typography.Paragraph>{['A','B','C','D'].filter(key=>row.data[`option${key}`]).map(key=><div key={key}>{key}. {row.data[`option${key}`]}</div>)}<div>Đáp án: {row.data.correctAnswer} · Xáo trộn: {row.data.allowShuffleOptions?'Có':'Không'}</div></Space>;
 return <FormModal title="Import câu hỏi vào đợt" open={open} onCancel={reset} busy={busy} width={1100} footer={<Space wrap><Button disabled={busy} onClick={reset}>Đóng</Button><Button disabled={!file || busy} loading={busy && mutation.variables?.mode==='preview'} onClick={()=>run('preview')}>Xem trước</Button><Popconfirm title="Xác nhận nhập toàn bộ câu hỏi hợp lệ?" description="Chỉ thực hiện khi bạn đã rà soát dữ liệu bên dưới." onConfirm={()=>run('commit')} disabled={!canCommitPreview(preview) || busy}><Button type="primary" disabled={!canCommitPreview(preview) || busy} loading={busy && mutation.variables?.mode==='commit'}>Xác nhận import</Button></Popconfirm></Space>}>
  <Space orientation="vertical" size={16} className="full-width">
   <Alert type="info" showIcon title="Chọn file .xlsx, tối đa 5 MB và 500 dòng" description="Xem trước không ghi dữ liệu. Khi có lỗi, sửa file rồi chọn lại. Cột cho_phep_xao_tron tùy chọn, mặc định true; đặt false để giữ nguyên thứ tự lựa chọn."/>
   <Upload accept=".xlsx" maxCount={1} fileList={file?[{uid:'selected',name:file.name,status:'done'}]:[]} disabled={busy} beforeUpload={selected=>{setPreview(null);setError('');if(selected.size>5*1024*1024 || !selected.name.toLowerCase().endsWith('.xlsx')){setFile(null);setError('Vui lòng chọn file .xlsx không quá 5 MB');return Upload.LIST_IGNORE;}setFile(selected);return false;}} onRemove={()=>{setFile(null);setPreview(null);setError('');}}><Button disabled={busy}>Chọn file Excel</Button></Upload>
   {error && <Alert type="error" showIcon title={error}/>}
   {preview && <><Alert type={preview.errorCount?'warning':'success'} showIcon title={`${preview.total} dòng · ${preview.validCount} hợp lệ · ${preview.errorCount} có lỗi`}/>
    {compact?<Space orientation="vertical" className="full-width">{preview.rows.map(row=><Card key={row.rowNumber} title={`Dòng ${row.rowNumber}`}>{renderRow(row)}{row.errors.map((message,index)=><Typography.Paragraph type="danger" key={index}>{message}</Typography.Paragraph>)}</Card>)}</Space>:<Table tableLayout="fixed" rowKey="rowNumber" dataSource={preview.rows} pagination={{pageSize:10}} columns={[{title:'Dòng',dataIndex:'rowNumber',width:70},{title:'Câu hỏi',render:(_,row)=>renderRow(row)},{title:'Lỗi',width:220,render:(_,row)=>row.errors.length?row.errors.map((message,index)=><div key={index}><Typography.Text type="danger">{message}</Typography.Text></div>):'Hợp lệ'}]}/>}</>}
  </Space>
 </FormModal>;
};
