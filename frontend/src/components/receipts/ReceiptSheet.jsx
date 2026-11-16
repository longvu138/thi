import {receiptDate} from '../../utils/receipts';
import {durationLabel} from '../../utils/results';
import './receipt.css';
export const ReceiptSheet=({receipt=null})=>{
 if(!receipt)return null;
 const time=receiptDate(receipt.submittedAt);const total=receipt.questionCount;
 const rows=[['Họ và tên',receipt.fullName],['Đảng bộ',receipt.partyCommittee],['Chi bộ',receipt.partyBranch],['Số câu trả lời đúng',`${receipt.correctCount}/${total}`],['Số câu sai',`${receipt.wrongCount}/${total}`],['Điểm (thang điểm 10)',receipt.score10],['Kết quả',receipt.result==='PASS'?'Đạt yêu cầu':'Không đạt yêu cầu'],['Thời gian làm bài',durationLabel(receipt.durationSeconds)],['Nộp bài lúc',`${time.time} ngày ${time.date}`],['Mã xác nhận',receipt.verificationCode]];
 return <article className="receipt-sheet" aria-label="Phiếu kết quả kiểm tra nhận thức">
  <header className="receipt-letterhead"><div><div>{receipt.partyCommittee||'ĐẢNG BỘ'}</div><strong>{receipt.partyBranch||'CHI BỘ'}</strong><div>*</div></div><div><strong className="receipt-party-title">ĐẢNG CỘNG SẢN VIỆT NAM</strong><p>…………, ngày {time.day} tháng {time.month} năm {time.year}</p></div></header>
  <div className="receipt-title"><h1>PHIẾU KẾT QUẢ</h1><h2>{receipt.title}</h2><div>-----</div></div>
  {receipt.isTrial&&<p className="receipt-trial">CHẠY THỬ — KHÔNG PHẢI KẾT QUẢ CHÍNH THỨC</p>}
  <table><tbody>{rows.map(([label,value])=><tr key={label}><th scope="row">{label}:</th><td className={label==='Kết quả'?(receipt.result==='PASS'?'receipt-pass':'receipt-fail'):undefined}>{value??''}</td></tr>)}</tbody></table>
  <p className="receipt-note">Phiếu do ứng dụng kiểm tra nhận thức tự động lập từ kết quả đã ghi nhận. Giữ mã xác nhận để tra cứu và in lại tại mục “Tra cứu phiếu kết quả”. Chi ủy đối chiếu mã xác nhận, ký và lưu tại chi bộ.</p>
  <div className="receipt-signature"><strong>XÁC NHẬN CỦA CHI ỦY</strong><p>(Ký, ghi rõ họ tên)</p></div>
 </article>;
};
