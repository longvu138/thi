import {Button,Card,Radio,Space,Typography} from 'antd';
export const AttemptQuestion=({question=null,index=0,total=0,selected=null,disabled=false,mobile=false,onChoose,onMove})=>{
 if(!question)return <Card>Đề thi không có câu hỏi để hiển thị.</Card>;
 const options=Array.isArray(question.options)?question.options:[];
 return <Card className="glass-card attempt-question">
  <Typography.Text type="secondary">{question.categoryName} · Câu {index+1}/{total}</Typography.Text>
  <Typography.Title level={4} className="attempt-question-content">{question.content}</Typography.Title>
  <Radio.Group className="attempt-options" value={selected} disabled={disabled} onChange={event=>onChoose(event.target.value)} aria-label={`Lựa chọn cho câu ${index+1}`}>
   {options.map(option=><Radio key={option.key} value={option.key} className={`attempt-option${selected===option.key?' is-selected':''}`}><strong>{option.key}</strong><span className="attempt-option-text">{option.content}</span></Radio>)}
  </Radio.Group>
  <Space wrap className="attempt-question-actions"><Button type="link" size="small" disabled={disabled || !selected} onClick={()=>onChoose(null)}>Bỏ chọn</Button>{!mobile&&<Button disabled={index===0} onClick={()=>onMove(-1)}>Câu trước</Button>}{!mobile&&<Button type="primary" disabled={index===total-1} onClick={()=>onMove(1)}>Câu sau</Button>}</Space>
 </Card>;
};
