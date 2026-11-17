import {prioritizeNewGroups} from '../../utils/adminRoundDetail';
import {useEffect,useState,useRef} from 'react';
import {Alert,Button,Card,Form,InputNumber,Radio,Space,Spin,Table,Tag,Typography} from 'antd';
import {ArrowUpOutlined,ArrowDownOutlined} from '@ant-design/icons';
import {useStructure,useStructureMutations} from '../../hooks/useStructure';
import {useMediaQuery} from '../../hooks/useMediaQuery';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {applyGroupCount,moveGroup,structureTotal,groupErrors,structurePayload} from '../../utils/structure';
import {FormModal} from '../common/FormModal';
import {QueryErrorState} from '../common/QueryErrorState';
export const RoundStructure=({roundId,previewOnOpen=false})=>{
 const query=useStructure(roundId),actions=useStructureMutations(roundId),[form]=Form.useForm(),feedback=useFeedback();
 const [bulk,setBulk]=useState(0),[sample,setSample]=useState(null),[serverErrors,setServerErrors]=useState({});
 const compact=useMediaQuery('(max-width:1199.98px)');
 useEffect(()=>{if(query.data)form.setFieldsValue({mode:query.data.selectionConfig.mode,count:query.data.questionCount,groups:query.data.groups});},[query.data,form]);
 const didPreview=useRef(false);const previewAsync=actions.preview.mutateAsync;
 useEffect(()=>{
  if(!previewOnOpen||didPreview.current||!query.data)return;
  didPreview.current=true;
  previewAsync(structurePayload({mode:query.data.selectionConfig.mode,count:query.data.questionCount,groups:query.data.groups})).then(setSample).catch(error=>feedback.error(getApiErrorMessage(error)));
 },[previewOnOpen,query.data,previewAsync,feedback]);
 const draft=Form.useWatch([],{form,preserve:true})||{mode:'RANDOM',groups:[],count:0};
 const groups=draft.groups||[],total=structureTotal(draft),errors={...groupErrors(groups),...serverErrors};
 const busy=actions.save.isPending||actions.preview.isPending,locked=Boolean(query.data?.locked);
 const invalid=draft.mode==='BY_GROUP'?Object.keys(errors).length>0:!Number.isInteger(draft.count)||draft.count<1||draft.count>(query.data?.groups||[]).reduce((s,g)=>s+g.validCount,0);
 const changeGroups=values=>{form.setFieldValue('groups',values);setServerErrors({});};
 const run=async preview=>{
  try{const result=await(preview?actions.preview:actions.save).mutateAsync(structurePayload(draft));setServerErrors({});if(preview)setSample(result);else feedback.success('Đã lưu cơ cấu đề');}
  catch(error){const rows=error.response?.data?.groupErrors||[];setServerErrors(Object.fromEntries(rows.map(g=>[g.category,g.message])));feedback.error(getApiErrorMessage(error));if(error.response?.status===409)query.refetch();}
 };
 const countCell=row=><div><InputNumber aria-label={`Lấy mỗi đề: ${row.category}`} min={0} precision={0} value={row.count} disabled={locked||busy} status={errors[row.category]?'error':undefined} onChange={value=>changeGroups(groups.map(g=>g.category===row.category?{...g,count:value}:g))}/>{errors[row.category]&&<div><Typography.Text type="danger">{errors[row.category]}</Typography.Text></div>}</div>;
 const orderCell=(_,row)=><Space><Button aria-label={`Đưa lên: ${row.category}`} icon={<ArrowUpOutlined/>} disabled={locked||busy||row._index===0} onClick={()=>changeGroups(moveGroup(groups,row._index,-1))}/><Button aria-label={`Đưa xuống: ${row.category}`} icon={<ArrowDownOutlined/>} disabled={locked||busy||row._index===groups.length-1} onClick={()=>changeGroups(moveGroup(groups,row._index,1))}/></Space>;
 const nameCell=row=><div style={{overflowWrap:'anywhere'}}><Typography.Text>{row.category}</Typography.Text> {row.isNew&&<Tag color="gold">Nghị quyết mới</Tag>}</div>;
 if(query.isError)return <QueryErrorState error={query.error} onRetry={()=>query.refetch()}/>;
 return <Spin spinning={query.isFetching}><Space orientation="vertical" size={16} className="full-width">
  {locked&&<Alert type="warning" showIcon title="Đợt đã có người thi, không thay đổi được cơ cấu đề" description="Cơ cấu chỉ đọc vì đã có lượt chính thức; lượt chạy thử không khóa cơ cấu."/>}
  <Form form={form} layout="vertical" disabled={locked||busy||query.isPending} onValuesChange={()=>setServerErrors({})}>
   <Form.Item name="mode" label="Cơ cấu đề"><Radio.Group options={[{value:'RANDOM',label:'Lấy ngẫu nhiên toàn bộ'},{value:'BY_GROUP',label:'Lấy theo từng nghị quyết'}]}/></Form.Item>
   {draft.mode==='RANDOM'?<Form.Item name="count" label="Số câu mỗi đề" extra={`Hiện có ${(query.data?.groups||[]).reduce((s,g)=>s+g.validCount,0)} câu hợp lệ`} validateStatus={invalid?'error':undefined} help={invalid?'Nhập số nguyên dương không vượt số câu hợp lệ':undefined}><InputNumber min={1} precision={0}/></Form.Item>:<>
    <Space wrap style={{marginBottom:16}}><Typography.Text>Mỗi nghị quyết lấy</Typography.Text><InputNumber aria-label="Số câu áp dụng cho tất cả" min={0} precision={0} value={bulk} onChange={setBulk} disabled={locked||busy}/><Typography.Text>câu</Typography.Text><Button disabled={locked||busy||!Number.isInteger(bulk)||bulk<0} onClick={()=>changeGroups(applyGroupCount(groups,bulk))}>Áp dụng cho tất cả</Button></Space>
    {compact?<Space orientation="vertical" className="full-width">{prioritizeNewGroups(groups).map(row=><Card className={row.isNew&&Number(row.count)===0?'round-new-group':undefined} key={row.category} size="small"><Space orientation="vertical" className="full-width">{nameCell(row)}<Typography.Text>Câu hiện có: {row.validCount}</Typography.Text><Typography.Text>Lấy mỗi đề</Typography.Text>{countCell(row)}{orderCell(null,row)}</Space></Card>)}</Space>:<Table rowKey="category" dataSource={prioritizeNewGroups(groups)} rowClassName={row=>row.isNew&&Number(row.count)===0?'round-new-group':''} pagination={false} columns={[{title:'Nghị quyết',render:(_,row)=>nameCell(row)},{title:'Câu hiện có',dataIndex:'validCount'},{title:'Lấy mỗi đề',render:(_,row)=>countCell(row)},{title:'Thứ tự',render:orderCell}]}/>}
   </>}
  </Form>
  <div className="round-structure-footer"><Typography.Text strong type={total<1?'danger':undefined}>Tổng: {total} câu mỗi đề</Typography.Text>
  <Space wrap><Button disabled={busy||query.isPending||invalid||total<1} loading={actions.preview.isPending} onClick={()=>run(true)}>Xem thử 1 đề mẫu</Button><Button type="primary" disabled={locked||busy||query.isPending||invalid||total<1} loading={actions.save.isPending} onClick={()=>run(false)}>Lưu</Button></Space></div>
  <FormModal open={Boolean(sample)} onCancel={()=>setSample(null)} title="Xem thử 1 đề mẫu" footer={<Button onClick={()=>setSample(null)}>Đóng</Button>}>
   <Space orientation="vertical" className="full-width">{(sample?.questions||[]).map(q=><Card key={q.id}><Typography.Text strong>Câu {q.position} · {q.categoryName}</Typography.Text><Typography.Paragraph style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{q.content}</Typography.Paragraph>{q.options.map(o=><Typography.Paragraph key={o.key} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{o.key}. {o.content} {o.key===q.correctAnswer&&<Tag color="green">Đáp án đúng</Tag>}</Typography.Paragraph>)}</Card>)}</Space>
  </FormModal>
 </Space></Spin>;
};
