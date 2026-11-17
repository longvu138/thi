import {DatePicker,Input} from 'antd';
import {roundWallTime} from '../../utils/examRounds';
export const RoundTimeInput=({compact,value,onChange})=>compact
 ? <Input type="datetime-local" value={value?.format('YYYY-MM-DDTHH:mm')||''} onChange={event=>onChange(roundWallTime(event.target.value))}/>
 : <DatePicker value={value} onChange={onChange} showTime={{format:'HH:mm'}} format="DD/MM/YYYY HH:mm" inputReadOnly style={{width:'100%'}}/>;
