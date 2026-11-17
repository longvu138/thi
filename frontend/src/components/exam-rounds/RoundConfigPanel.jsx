import {useEffect,useState} from 'react';
import {Button,Divider,Form,Input,InputNumber,Popconfirm,Space,Switch,Typography} from 'antd';
import {RoundTimeInput} from './RoundTimeInput';
import {ROUND_SWITCHES} from '../../constants/examRounds';
import {roundPayload,roundPickerTime} from '../../utils/examRounds';
export const RoundConfigPanel=({round,busy,onSave,onDelete,onDirty})=>{
 const [form]=Form.useForm();const [dirty,setDirty]=useState(false);
 useEffect(()=>{if(dirty)return;form.setFieldsValue({...round,trialStartAt:roundPickerTime(round.trialStartAt),startAt:roundPickerTime(round.startAt),endAt:roundPickerTime(round.endAt)});},[form,round,dirty]);
 const save=async values=>{if(await onSave(roundPayload(values))){setDirty(false);onDirty(false);}};
 const positive=[{required:true,type:'integer',min:1,max:2147483647,message:'Nhập số nguyên dương'}];
 return <Form form={form} disabled={busy} layout="vertical" onValuesChange={()=>{setDirty(true);onDirty(true);}} onFinish={save}>
  <Form.Item name="title" label="Tên đợt" rules={[{required:true,whitespace:true},{max:255}]}><Input/></Form.Item><Form.Item name="description" label="Mô tả" rules={[{max:15000}]}><Input.TextArea autoSize={{minRows:2,maxRows:6}}/></Form.Item>
  <Typography.Title level={5}>Thời gian (giờ Việt Nam)</Typography.Title>
  <Form.Item name="trialStartAt" label="Chạy thử từ"><RoundTimeInput compact/></Form.Item>
  <Form.Item name="startAt" label="Bắt đầu"><RoundTimeInput compact/></Form.Item>
  <Form.Item name="endAt" label="Kết thúc" dependencies={['startAt']} rules={[({getFieldValue})=>({validator:(_,value)=>value&&getFieldValue('startAt')&&!value.isAfter(getFieldValue('startAt'))?Promise.reject(new Error('Kết thúc phải sau bắt đầu')):Promise.resolve()})]}><RoundTimeInput compact/></Form.Item>
  <Typography.Title level={5}>Cách thi</Typography.Title>
  <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={positive}><InputNumber min={1} precision={0}/></Form.Item><Form.Item name="maxAttempts" label="Số lượt tối đa" rules={positive}><InputNumber min={1} precision={0}/></Form.Item><Form.Item name="passingPercentage" label="Ngưỡng đạt (%)" rules={[{required:true,type:'integer',min:0,max:100}]}><InputNumber min={0} max={100} precision={0}/></Form.Item>
  <Typography.Title level={5}>Tùy chọn</Typography.Title>{ROUND_SWITCHES.map(item=><Form.Item key={item.key} name={item.key} label={item.label} valuePropName="checked"><Switch/></Form.Item>)}
  <div className="round-structure-footer"><Space><Button type="primary" htmlType="submit" loading={busy} disabled={!dirty}>Lưu</Button></Space></div>
  {!round.summary?.hasAttempts&&<><Divider/><Popconfirm title="Xóa đợt và câu hỏi chưa dùng?" onConfirm={onDelete}><Button danger disabled={busy}>Xóa đợt</Button></Popconfirm></>}
 </Form>;
};
