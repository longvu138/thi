import {Alert,Button,Space,Tag,Typography} from 'antd';
import {roundReadiness} from '../../utils/examUx';
export const RoundReadiness=({round,onTab})=><Alert type="info" showIcon title="Sẵn sàng mở đợt" description={<Space orientation="vertical" className="full-width">{roundReadiness(round).map(item=><Space key={item.key} wrap><Tag color={item.ready?'green':'default'}>{item.ready?'Đã có':'Kiểm tra'}</Tag><Typography.Text>{item.label}</Typography.Text>{!item.ready&&<Button type="link" size="small" onClick={()=>onTab(item.tab)}>Xem / Sửa</Button>}</Space>)}</Space>}/>;
