import {FormModal} from '../common/FormModal';
import {useEffect} from 'react';
import {Button,Form,Input,Select,Space,Switch} from 'antd';
import {questionPayload} from '../../utils/questions';
const required=label=>({required:true,whitespace:true,message:`Vui lòng nhập ${label}`});
export const QuestionFormModal=({editing=null,busy=false,onClose,onSave})=>{
 const [form]=Form.useForm();
 useEffect(()=>{form.resetFields();if(editing)form.setFieldsValue({...editing,allowShuffleOptions:editing.allowShuffleOptions??true});},[editing,form]);
 return <FormModal title={editing?.id?'Sửa câu hỏi':'Thêm câu hỏi'} open={editing!==null} onCancel={onClose} busy={busy} width={960} footer={<Space><Button disabled={busy} onClick={onClose}>Hủy</Button><Button type="primary" loading={busy} onClick={()=>form.submit()}>Lưu</Button></Space>}>
  <Form className="form-modal-grid" form={form} layout="vertical" onFinish={values=>onSave(questionPayload(values))}>
   <Form.Item name="questionCode" label="Mã câu hỏi" rules={[required('mã câu hỏi'),{max:100,message:'Mã không quá 100 ký tự'}]}><Input/></Form.Item>
   <Form.Item name="category" label="Nhóm câu hỏi" extra="Nhập tên nhóm/chuyên đề của câu hỏi trong đợt này." rules={[required('nhóm câu hỏi'),{max:255,message:'Nhóm không quá 255 ký tự'}]}><Input/></Form.Item>
   <Form.Item className="form-span-all" name="content" label="Nội dung" rules={[required('nội dung'),{max:15000,message:'Nội dung không quá 15000 ký tự'}]}><Input.TextArea autoSize={{minRows:2,maxRows:4}}/></Form.Item>
   {['A','B','C','D'].map(letter=><Form.Item key={letter} name={`option${letter}`} label={`Lựa chọn ${letter}`} rules={[...(['A','B'].includes(letter)?[required(`lựa chọn ${letter}`)]:[]),{max:15000,message:'Lựa chọn không quá 15000 ký tự'}]}><Input.TextArea autoSize={{minRows:2,maxRows:3}}/></Form.Item>)}
   <Form.Item name="correctAnswer" label="Đáp án đúng" rules={[{required:true,message:'Vui lòng chọn đáp án đúng'}]}><Select options={['A','B','C','D'].map(value=>({value,label:value}))}/></Form.Item>
   <Form.Item name="allowShuffleOptions" label="Cho phép xáo trộn lựa chọn" valuePropName="checked" extra={'Tắt với câu có lựa chọn như “A và B đúng”, “Tất cả các đáp án trên”.'}><Switch/></Form.Item>
  </Form>
 </FormModal>;
};
