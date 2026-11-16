import { Descriptions, Space, Tag, Typography } from 'antd';
import { ROUND_STATUSES, ROUND_SWITCHES } from '../../constants/examRounds';
import { formatRoundTime, roundWindowLabel } from '../../utils/examRounds';
export const RoundStatus = ({ status }) => {
 const item = ROUND_STATUSES.find(value => value.value === status);
 return <Tag color={item?.color || 'default'}>{item?.label || 'Chưa xác định'}</Tag>;
};
export const ExamRoundSummary = ({ round = null, compact = false }) => {
 if (!round) return null;
 return <Space orientation="vertical" size={16} className="full-width">
  <Space wrap><RoundStatus status={round.status}/><Typography.Text>{roundWindowLabel(round)}</Typography.Text></Space>
  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{round.description || 'Chưa có mô tả'}</Typography.Paragraph>
  <Descriptions bordered column={compact ? 1 : 2} items={[
   { key: 'count', label: 'Số câu mỗi lượt', children: round.questionCount },
   { key: 'duration', label: 'Thời lượng', children: `${round.durationMinutes} phút` },
   { key: 'attempts', label: 'Số lượt tối đa', children: round.maxAttempts },
   { key: 'passing', label: 'Ngưỡng đạt', children: `${round.passingPercentage}%` },
   { key: 'trial', label: 'Chạy thử từ (giờ Việt Nam)', children: round.trialStartAt ? formatRoundTime(round.trialStartAt) : 'Không chạy thử' },
   { key: 'start', label: 'Bắt đầu (giờ Việt Nam)', children: formatRoundTime(round.startAt) },
   { key: 'end', label: 'Kết thúc (giờ Việt Nam)', children: formatRoundTime(round.endAt) },
   ...ROUND_SWITCHES.map(item => ({ key: item.key, label: item.label, children: round[item.key] ? 'Có' : 'Không' })),
  ]}/>
 </Space>;
};
