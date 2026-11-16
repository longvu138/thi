const ExcelJS=require('exceljs');
const service=require('./reports.service');
const LABELS={PASSED:'Đạt',FAILED:'Không đạt',IN_PROGRESS_ROUND:'Chưa hoàn thành',NOT_STARTED:'Chưa thi'};
const time=value=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'';
const columns=(sheet,names)=>{sheet.columns=names.map(([header,key,width=20])=>({header,key,width}));sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true};sheet.autoFilter={from:'A1',to:{row:1,column:names.length}};};
const write=async(id,query,stream)=>service.read(id,query,async({trx,round,filters,now})=>{
 const workbook=new ExcelJS.stream.xlsx.WorkbookWriter({stream,useStyles:true,useSharedStrings:false});
 const summary=workbook.addWorksheet('Tổng hợp');columns(summary,[['Chỉ tiêu','label',36],['Giá trị','value',60]]);
 for(const [label,value] of [['Đợt kiểm tra',round.title],['Dữ liệu',filters.isTrial?'Chạy thử':'Chính thức'],['Tìm kiếm',filters.search],['Đảng bộ',filters.committeeLabel||filters.partyCommittee],['Chi bộ',filters.partyBranch],['Kết quả',LABELS[filters.result]||'Tất cả'],['Thời điểm báo cáo (Việt Nam)',time(new Date(now).toISOString())]])summary.addRow({label,value}).commit();
 const detail=workbook.addWorksheet('Chi tiết');columns(detail,[['Họ tên','fullName',28],['Đảng bộ','partyCommittee',26],['Chi bộ','partyBranch',26],['Đợt kiểm tra','title',35],['Số lượt đã dùng','usedAttempts'],['Số lượt tối đa','maxAttempts'],['Điểm cao nhất (%)','bestPercentage'],['Kết quả cuối','finalResult',24],['Tham gia gần nhất (Việt Nam)','latestAt',30]]);
 const stats=await service.statistics(trx,round,filters,now,row=>detail.addRow({...row,finalResult:LABELS[row.finalResult],latestAt:time(row.latestAt)}).commit());detail.commit();
 for(const [key,label] of Object.entries({participantCount:'Tổng số người tham gia',passedCount:'Số người Đạt',failedCount:'Số người Không đạt',incompleteCount:'Số người chưa hoàn thành',passRate:'Tỷ lệ Đạt (%)',attemptCount:'Tổng số lượt thi',averageAttempts:'Số lượt trung bình mỗi người'}))summary.addRow({label,value:stats[key]}).commit();summary.commit();
 const questions=workbook.addWorksheet('Theo câu hỏi');columns(questions,[['Mã câu','questionCode'],['Nhóm','categoryName',25],['Nội dung câu hỏi','content',60],['Số lượt gặp','encounterCount'],['Số lượt đúng','correctCount'],['Tỷ lệ đúng (%)','correctRate'],['Chọn A gốc','optionACount'],['Chọn B gốc','optionBCount'],['Chọn C gốc','optionCCount'],['Chọn D gốc','optionDCount'],['Bỏ trống','unansweredCount']]);
 let questionCount=0;
 for(let offset=0;;offset+=100){const page=await service.questionPage(trx,round,filters,now,{page:Math.floor(offset/100)+1,limit:100,offset});for(const row of page.items){questions.addRow(row).commit();questionCount++;}if(offset+page.items.length>=page.pagination.total)break;}
 questions.commit();
 const committees=workbook.addWorksheet('Theo đảng bộ');columns(committees,[['Đảng bộ','partyCommittee',40],['Tham gia','participantCount'],['Đạt','passedCount'],['Không đạt','failedCount'],['Chưa hoàn thành','incompleteCount'],['Tỷ lệ Đạt (%)','passRate'],['Tổng lượt','attemptCount']]);
 for(let offset=0;;offset+=100){const page=await require('./committees.service').page(trx,round,filters,now,{page:Math.floor(offset/100)+1,limit:100,offset});for(const row of page.items)committees.addRow(row).commit();if(offset+page.items.length>=page.pagination.total)break;}committees.commit();
 await workbook.commit();return {participantCount:stats.participantCount,questionCount,isTrial:filters.isTrial,filters:{committeeKey:filters.committeeKey,search:filters.search,partyCommittee:filters.partyCommittee,partyBranch:filters.partyBranch,result:filters.result,sort:filters.sort,order:filters.order}};
});
module.exports={write};
