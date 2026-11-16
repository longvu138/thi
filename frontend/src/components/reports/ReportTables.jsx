import { Button, Card, Pagination, Space, Table, Tag, Typography } from 'antd';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { formatRoundTime } from '../../utils/examRounds';
import { resultLabel } from '../../utils/results';
export const ReportTables=({data={},questions=false,loading=false,page={page:1,limit:20},onPage,onParticipant})=>{
 const compact=useMediaQuery('(max-width: 1199.98px)');const rows=Array.isArray(data.items)?data.items:[];
 const columns=questions?[
 {title:'Mã câu / nhóm',key:'questionCode',render:(_,r)=><><strong>{r.questionCode}</strong><div>{r.categoryName}</div></>},
 {title:'Nội dung',dataIndex:'content',width:340},
 ...[['encounterCount','Lượt gặp'],['correctCount','Lượt đúng'],['correctRate','Tỷ lệ đúng (%)'],['optionACount','A gốc'],['optionBCount','B gốc'],['optionCCount','C gốc'],['optionDCount','D gốc'],['unansweredCount','Bỏ trống']].map(([dataIndex,title])=>({dataIndex,title,width:105})),
 ]:[
 {title:'Họ tên',dataIndex:'fullName',width:190},{title:'Đảng bộ',dataIndex:'partyCommittee',width:170},{title:'Chi bộ',dataIndex:'partyBranch',width:170},{title:'Đợt kiểm tra',dataIndex:'title',width:200},
 {title:'Lượt dùng / tối đa',key:'attempts',width:130,render:(_,r)=>`${r.usedAttempts} / ${r.maxAttempts}`},
 {title:'Điểm cao nhất (%)',dataIndex:'bestPercentage',width:130,render:v=>v??'Chưa có'},
 {title:'Kết quả cuối',dataIndex:'finalResult',width:160,render:v=><Tag color={v==='PASSED'?'green':v==='FAILED'?'red':'default'}>{resultLabel(v)}</Tag>},
 ...(onParticipant?[{title:'Thao tác',key:'actions',width:160,render:(_,row)=><Button onClick={()=>onParticipant(row)}>Xem các lượt</Button>}]:[]),
 {title:'Gần nhất (giờ Việt Nam)',dataIndex:'latestAt',width:200,render:formatRoundTime},
 ];
 return <Space orientation="vertical" className="full-width" size={16}>
 {compact?<Space orientation="vertical" className="full-width">{!rows.length&&!loading&&<Card>Chưa có dữ liệu phù hợp</Card>}{rows.map(row=><Card key={row.userId||row.questionId} className="glass-card" loading={loading}><Typography.Title level={5} style={{marginTop:0,overflowWrap:'anywhere'}}>{questions?row.questionCode:row.fullName}</Typography.Title>{columns.map(column=><div key={column.dataIndex||column.key} style={{marginBottom:8,overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}><Typography.Text type="secondary">{column.title}: </Typography.Text>{column.render?column.render(row[column.dataIndex],row):row[column.dataIndex]}</div>)}</Card>)}</Space>:<Card className="glass-card"><Table rowKey={questions?'questionId':'userId'} loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{x:questions?1400:1450}} tableLayout="fixed"/></Card>}
 {loading&&compact&&!rows.length&&<Button loading>Đang tải dữ liệu</Button>}
 <Pagination current={page.page} pageSize={page.limit} total={data.pagination?.total||0} showSizeChanger onChange={(next,limit)=>onPage({page:next,limit})}/>
 </Space>;
};
