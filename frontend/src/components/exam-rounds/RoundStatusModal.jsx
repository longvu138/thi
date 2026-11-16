import {Button,Space,Typography} from 'antd';
import {FormModal} from '../common/FormModal';
import {ExamRoundSummary} from './ExamRoundSummary';
export const RoundStatusModal=({round,busy=false,onCancel,onConfirm})=><FormModal open={Boolean(round)} busy={busy} title={round?.status==='OPEN'?'Đóng đợt kiểm tra?':'Xác nhận mở đợt kiểm tra'} width={760} onCancel={onCancel} footer={<Space wrap><Button disabled={busy} onClick={onCancel}>Hủy</Button><Button type="primary" loading={busy} onClick={onConfirm}>{round?.status==='OPEN'?'Đóng đợt':'Mở đợt'}</Button></Space>}>
 {round&&<><Typography.Title level={4} style={{overflowWrap:'anywhere'}}>{round.title}</Typography.Title><Typography.Paragraph>Kiểm tra cấu hình và thời gian bên dưới (giờ Việt Nam) trước khi xác nhận. Backend sẽ kiểm tra lại số câu và cơ cấu.</Typography.Paragraph><ExamRoundSummary round={round} compact/></>}
</FormModal>;
