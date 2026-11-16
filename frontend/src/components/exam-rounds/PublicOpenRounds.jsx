import {useEffect,useState} from 'react';
import {Alert,Button,Empty,Pagination,Skeleton,Tag} from 'antd';
import {ClockCircleOutlined} from '@ant-design/icons';
import {usePublicExamRounds} from '../../hooks/useExamRounds';
import {publicRoundState} from '../../utils/publicRounds';
export const PublicOpenRounds=({onSelect,selectedId})=>{
 const [page,setPage]=useState(1),[now,setNow]=useState(Date.now);
 const query=usePublicExamRounds(page);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const rows=(query.data?.items||[]).filter(round=>publicRoundState(round,now).open);
 return <section className="participant-open-rounds" aria-labelledby="open-rounds-title">
  <h2 id="open-rounds-title">Đợt kiểm tra đang mở</h2>
  {query.isPending?<Skeleton active paragraph={{rows:3}}/>:query.isError?<Alert type="warning" showIcon title="Chưa tải được danh sách đợt kiểm tra" action={<Button onClick={()=>query.refetch()}>Thử lại</Button>}/>:<>
   {!rows.length&&<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hiện chưa có đợt kiểm tra đang mở"/>}
   {rows.map(round=>{const state=publicRoundState(round,now);return <article className="participant-open-round" key={round.id}>
    <div><h3>{round.title}</h3><Tag color={state.isTrial?'gold':'green'}>{state.isTrial?'Chạy thử':'Đang mở'}</Tag></div>
    <p>{round.questionCount} câu · {round.durationMinutes} phút</p>
    <p className="participant-round-countdown"><ClockCircleOutlined/> {state.label}: <strong>{state.countdown}</strong></p>
    <Button type={selectedId===round.id?'primary':'default'} onClick={()=>onSelect(round)}>{selectedId===round.id?'Đã chọn · Nhập thông tin':'Chọn vào thi'}</Button>
   </article>;})}
   <Pagination size="small" current={page} pageSize={5} total={query.data?.pagination?.total||0} onChange={setPage} hideOnSinglePage showSizeChanger={false}/>
  </>}
 </section>;
};
