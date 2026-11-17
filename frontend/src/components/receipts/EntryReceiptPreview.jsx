import {useEffect,useRef,useState} from 'react';
import {ReceiptSheet} from './ReceiptSheet';
import {receiptPreviewScale} from '../../utils/receiptPresentation';
export const EntryReceiptPreview=({values={},title})=>{
 const viewport=useRef(null),paper=useRef(null);const [size,setSize]=useState({scale:1,height:0});
 useEffect(()=>{
  let active=true;
  const measure=()=>{if(!active||!viewport.current||!paper.current)return;setSize(receiptPreviewScale(viewport.current.clientWidth,paper.current.scrollWidth,paper.current.scrollHeight));};
  const observer=new ResizeObserver(measure);observer.observe(viewport.current);observer.observe(paper.current);measure();document.fonts?.ready.then(measure);
  return()=>{active=false;observer.disconnect();};
 },[]);
 const receipt={fullName:values.fullName?.trim()||'Họ và tên người dự thi',partyCommittee:values.partyCommittee?.trim()||'Đảng bộ …',partyBranch:values.partyBranch?.trim()||'Chi bộ …',title:title||'TÊN ĐỢT KIỂM TRA'};
 return <div className="receipt-modal-preview" ref={viewport} aria-label="Mẫu phiếu PDF theo thông tin đang nhập"><div style={{height:size.height||undefined,overflow:'hidden'}}><div className="receipt-preview-canvas" ref={paper} style={{transform:`scale(${size.scale})`}}><ReceiptSheet receipt={receipt} preview/></div></div></div>;
};
