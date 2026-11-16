import {Space,Tag,Typography} from 'antd';
import {resultLabel} from '../../utils/results';
export const ParticipationSummary=({participation=null})=>participation?<Space orientation="vertical" size={2}>
 <Typography.Text>Lượt chính thức: {participation.usedAttempts} / {participation.maxAttempts} · Còn {participation.remainingAttempts}</Typography.Text>
 <Tag>{resultLabel(participation.finalResult)}</Tag>
 {participation.isTrial&&<Typography.Text type="secondary">Chạy thử: {participation.trialUsedAttempts} / {participation.maxAttempts} lượt</Typography.Text>}
</Space>:null;
