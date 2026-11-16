const db = require('../../config/database');
const {httpError} = require('../../utils/http-error');
const {readWorkbook,previewToken,verifyPreview} = require('./questions.excel');
const {insert,rethrow,round} = require('./questions.service');
const checkExisting = async (roundId,rows,client) => {
  const candidates=rows.filter(row=>row.data.questionCode);
  if (!candidates.length) return;
  // So sánh mã theo đúng collation MySQL, không mô phỏng bằng JavaScript.
  const select=candidates.map(()=> 'SELECT ? AS source_row, CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AS code').join(' UNION ALL ');
  const bindings=candidates.flatMap(row=>[row.rowNumber,row.data.questionCode]);
  const [matches]=await client.raw(`SELECT i.source_row,
    EXISTS(SELECT 1 FROM questions q WHERE q.exam_round_id=? AND q.question_code=i.code) AS already_used,
    EXISTS(SELECT 1 FROM (${select}) p WHERE p.code=i.code AND p.source_row<i.source_row) AS duplicated
    FROM (${select}) i`,[roundId,...bindings,...bindings]);
  const byRow=new Map(rows.map(row=>[row.rowNumber,row]));
  for (const match of matches) {
    const row=byRow.get(Number(match.source_row));
    if (match.already_used) row.errors.push('Mã câu hỏi đã được sử dụng trong đợt');
    if (match.duplicated && !row.errors.includes('Mã câu hỏi bị trùng trong file')) row.errors.push('Mã câu hỏi bị trùng trong file');
  }
};
const importQuestions = async ({roundId,mode,buffer,token,userId}) => {
  await round(roundId);
  if (!['preview','commit'].includes(mode)) throw httpError(422,'Chế độ import phải là preview hoặc commit');
  if (!buffer?.length) throw httpError(422,'Vui lòng chọn file Excel');
  if (mode==='commit') verifyPreview(token,buffer,`${userId}:${roundId}`);
  const rows=await readWorkbook(buffer);
  const invalid=rows.some(row=>row.errors.length);
  if (mode==='preview') {
    await checkExisting(roundId,rows,db);
    const validCount=rows.filter(row=>!row.errors.length).length;
    return {rows,total:rows.length,validCount,errorCount:rows.length-validCount,previewToken:validCount===rows.length?previewToken(buffer,`${userId}:${roundId}`):null};
  }
  if (invalid) throw httpError(422,'File có lỗi dữ liệu, vui lòng xem trước và sửa trước khi import');
  try {
    return await db.transaction(async trx=>{
      await round(roundId,trx,true);
      await checkExisting(roundId,rows,trx);
      if (rows.some(row=>row.errors.length)) throw httpError(409,'Câu hỏi của đợt đã thay đổi hoặc mã đã được nhập, vui lòng xem trước lại');
      const ids=[];
      for (const row of [...rows].sort((a,b)=>a.data.questionCode.localeCompare(b.data.questionCode))) ids.push(await insert(roundId,row.data,trx));
      return {importedCount:ids.length,questionIds:ids};
    });
  } catch(error) {rethrow(error);}
};
module.exports={importQuestions};
