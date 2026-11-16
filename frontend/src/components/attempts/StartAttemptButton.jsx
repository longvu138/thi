import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate,useOutletContext} from 'react-router-dom';
import {Alert,Button,Descriptions,Space,Typography} from 'antd';
import {useStartAttempt} from '../../hooks/useAttempts';
import {useFeedback} from '../../hooks/useFeedback';
import {getApiErrorMessage} from '../../utils/apiError';
import {startButtonState} from '../../utils/examRounds';
import {FormModal} from '../common/FormModal';
export const StartAttemptButton=({round=null,label})=>{
 const client=useQueryClient();
 const mutation=useStartAttempt(),feedback=useFeedback(),navigate=useNavigate();const [confirm,setConfirm]=useState(false);
 const {currentUser}=useOutletContext()||{};const state=startButtonState(round);const participation=round?.participation||{};
 const start=async()=>{try{await mutation.mutateAsync(round.id);setConfirm(false);}catch(error){setConfirm(false);client.invalidateQueries({queryKey:['exam-rounds']});feedback.error(getApiErrorMessage(error));}};
 return <Space orientation="vertical" size={4}>
  <Button type="primary" disabled={state.disabled} loading={mutation.isPending} onClick={()=>state.resume?navigate(`/attempts/${participation.activeAttempt.id}`):setConfirm(true)}>{!state.resume&&label?label:state.label}</Button>
  {state.reason&&<Typography.Text type="secondary">{state.reason}</Typography.Text>}
  <FormModal open={confirm} title="Xác nhận bắt đầu lượt thi" width={640} busy={mutation.isPending} onCancel={()=>setConfirm(false)} footer={<Space wrap><Button disabled={mutation.isPending} onClick={()=>setConfirm(false)}>Hủy</Button><Button type="primary" loading={mutation.isPending} onClick={start}>Bắt đầu làm bài</Button></Space>}>
   <Descriptions column={1} items={[{key:'round',label:'Đợt kiểm tra',children:round?.title},{key:'questions',label:'Số câu',children:round?.questionCount},{key:'duration',label:'Thời lượng',children:`${round?.durationMinutes||0} phút`},{key:'attempt',label:participation.isTrial?'Lượt chạy thử':'Lượt chính thức',children:`${participation.nextAttemptNumber||1} / ${round?.maxAttempts||0}`},{key:'name',label:'Họ và tên',children:currentUser?.fullName},{key:'committee',label:'Đảng bộ',children:currentUser?.partyCommittee},{key:'branch',label:'Chi bộ',children:currentUser?.partyBranch}]}/>
   <Alert type="info" showIcon title={participation.isTrial?'Đây là lượt chạy thử':'Kiểm tra thông tin trước khi bắt đầu'} description="Thời gian làm bài chỉ tính sau khi bạn bấm Bắt đầu làm bài và máy chủ tạo lượt."/>
  </FormModal>
 </Space>;
};
