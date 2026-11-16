import {Button,Card,Space,Tag,Typography,Progress} from 'antd';
import {groupAttemptQuestions} from '../../utils/attempts';
export const AttemptNavigator=({questions=[],selected={},currentIndex=0,currentUser=null,onSelect,embedded=false})=>{
 const groups=groupAttemptQuestions(questions);
 const answered=(Array.isArray(questions)?questions:[]).filter(q=>selected[q.id]).length;
 return <Card className="glass-card attempt-navigator" title={embedded?undefined:"Danh sách câu hỏi"}>
  {currentUser&&<div className="attempt-person"><div className="attempt-person-name">{currentUser.fullName}</div><div className="attempt-person-unit">{[currentUser.partyCommittee,currentUser.partyBranch].filter(Boolean).join(" · ")}</div></div>}
  <Progress percent={questions.length?Math.round(answered*100/questions.length):0} showInfo={false} strokeColor="#b3102b" aria-label="Tiến độ trả lời"/>
  <Space wrap style={{marginBottom:16}}><Tag color="green">Đã trả lời: {answered}</Tag><Tag>Chưa trả lời: {questions.length-answered}</Tag><Tag color="red">Đang xem: {currentIndex+1}</Tag></Space>
  {groups.map(group=><section key={group.name} className="attempt-question-group"><Typography.Title level={5}>{group.name}</Typography.Title><div className="attempt-number-grid">{group.items.map(item=><Button key={item.id} type={item.index===currentIndex?'primary':'default'} className={selected[item.id]?'is-answered':''} aria-current={item.index===currentIndex?'step':undefined} aria-label={`Câu ${item.index+1}, ${selected[item.id]?'đã trả lời':'chưa trả lời'}`} onClick={()=>onSelect(item.index)}>{item.index+1}</Button>)}</div></section>)}
 </Card>;
};
