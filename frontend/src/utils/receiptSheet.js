import {receiptDate} from './receipts.js';
import {durationLabel} from './results.js';
export const receiptRows=(receipt,preview=false)=>{
 const time=receiptDate(receipt.submittedAt),total=receipt.questionCount;
 return [['Họ và tên',receipt.fullName],['Đảng bộ',receipt.partyCommittee],['Chi bộ',receipt.partyBranch],['Số câu trả lời đúng',preview?'':`${receipt.correctCount}/${total}`],['Số câu sai',preview?'':`${receipt.wrongCount}/${total}`],['Điểm (thang điểm 10)',preview?'':receipt.score10],['Kết quả',preview?'':receipt.result==='PASS'?'Đạt yêu cầu':'Không đạt yêu cầu'],['Thời gian làm bài',preview?'':durationLabel(receipt.durationSeconds)],['Nộp bài lúc',preview?'':`${time.time} ngày ${time.date}`],['Mã xác nhận',preview?'':receipt.verificationCode]];
};
