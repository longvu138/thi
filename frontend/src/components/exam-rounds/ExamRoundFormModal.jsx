import {FormModal} from '../common/FormModal';
import { useEffect } from 'react';
import { Alert, Button, DatePicker,  Form, Input, InputNumber, Space, Switch } from 'antd';
import { ROUND_DEFAULTS, ROUND_SWITCHES } from '../../constants/examRounds';
import { roundPayload, roundPickerTime, roundWallTime } from '../../utils/examRounds';
const RoundTimeInput = ({ compact, value, onChange }) => compact
 ? <Input type="datetime-local" value={value?.format('YYYY-MM-DDTHH:mm') || ''} onChange={event => onChange(roundWallTime(event.target.value))}/>
 : <DatePicker value={value} onChange={onChange} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" inputReadOnly style={{ width: '100%' }}/>;
export const ExamRoundFormModal = ({ editing = null, compact = false, busy = false, onClose, onSave }) => {
 const [form] = Form.useForm();
 useEffect(() => {
  form.resetFields();
  if (editing) form.setFieldsValue({ ...ROUND_DEFAULTS, ...editing, trialStartAt: roundPickerTime(editing.trialStartAt), startAt: roundPickerTime(editing.startAt), endAt: roundPickerTime(editing.endAt) });
 }, [editing, form]);
 const positive = [{ required: true, message: 'Vui lòng nhập số nguyên dương' }, { type: 'integer', min: 1, max: 2147483647, message: 'Nhập số nguyên từ 1 đến 2147483647' }];
 return <FormModal title={editing?.id ? 'Sửa đợt kiểm tra' : 'Tạo đợt kiểm tra'} open={editing !== null} width={1100} onCancel={onClose} busy={busy} footer={<Space wrap><Button disabled={busy} onClick={onClose}>Hủy</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>Lưu</Button></Space>}>
  <Form className="form-modal-grid form-modal-grid--rounds" form={form} layout="vertical" onFinish={values => onSave(roundPayload(values))}>
   <Alert className="form-span-all" style={{ marginBottom: 16 }} type="info" showIcon title="Cấu hình mới chỉ áp dụng cho các lượt tạo sau khi lưu" description="Tạo đợt Nháp, thêm hoặc import câu trong tab Câu hỏi, lưu Cơ cấu đề rồi mở đợt. Thời gian bên dưới là giờ Việt Nam (UTC+7)."/>
   <Form.Item className="form-span-two" name="title" label="Tên đợt kiểm tra" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên đợt kiểm tra' }, { max: 255, message: 'Tên không quá 255 ký tự' }]}><Input/></Form.Item>
   <Form.Item className="form-span-two" name="description" label="Mô tả" rules={[{ max: 15000, message: 'Mô tả không quá 15000 ký tự' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }}/></Form.Item>
   <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={positive}><InputNumber min={1} precision={0} style={{ width: '100%' }}/></Form.Item>
   <Form.Item name="maxAttempts" label="Số lượt tối đa mỗi người" rules={positive}><InputNumber min={1} precision={0} style={{ width: '100%' }}/></Form.Item>
   <Form.Item name="passingPercentage" label="Ngưỡng đạt (%)" rules={[{ required: true, message: 'Vui lòng nhập ngưỡng đạt' }, { type: 'integer', min: 0, max: 100, message: 'Nhập số nguyên từ 0 đến 100' }]}><InputNumber min={0} max={100} precision={0} style={{ width: '100%' }}/></Form.Item>
   <Form.Item className="form-span-two" name="trialStartAt" label="Bắt đầu chạy thử (giờ Việt Nam)" extra="Tùy chọn; phải trước thời điểm bắt đầu chính thức. Lượt thử được đếm riêng."><RoundTimeInput compact={compact}/></Form.Item>
   <Form.Item className="form-span-two" name="startAt" label="Bắt đầu (giờ Việt Nam)" extra="Để trống nếu không giới hạn thời điểm bắt đầu."><RoundTimeInput compact={compact}/></Form.Item>
   <Form.Item className="form-span-two" name="endAt" label="Kết thúc (giờ Việt Nam)" dependencies={['startAt']} extra="Để trống nếu không giới hạn thời điểm kết thúc." rules={[({ getFieldValue }) => ({ validator(_, value) { const start = getFieldValue('startAt'); return value && start && !value.isAfter(start) ? Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu')) : Promise.resolve(); } })]}><RoundTimeInput compact={compact}/></Form.Item>
   {ROUND_SWITCHES.map(item => <Form.Item className="form-span-two" key={item.key} name={item.key} label={item.label} valuePropName="checked"><Switch/></Form.Item>)}
  </Form>
 </FormModal>;
};
