export const normalizeUsers = data => ({
  items: Array.isArray(data?.items) ? data.items.filter(item => item && typeof item === 'object') : [],
  pagination: {page:1,limit:20,total:0,...(data?.pagination || {})},
});
export const userPayload = values => {
  const payload = {fullName:values.fullName,role:values.role,isActive:values.isActive};
  if (values.username !== undefined) payload.username = values.username;
  if (values.password) payload.password = values.password;
  return payload;
};

export const normalizeUserPreview = data => ({total:Number(data?.total)||0,validCount:Number(data?.validCount)||0,errorCount:Number(data?.errorCount)||0,previewToken:typeof data?.previewToken==='string'?data.previewToken:null,rows:Array.isArray(data?.rows)?data.rows.filter(Boolean).map(row=>({...row,data:{username:row.data?.username || '',fullName:row.data?.fullName || '',role:row.data?.role || 'USER',isActive:row.data?.isActive!==false},errors:Array.isArray(row.errors)?row.errors:[]})):[]});
export const canImportUsers = preview => Boolean(preview?.previewToken && preview.total>0 && preview.validCount===preview.total && preview.errorCount===0);
