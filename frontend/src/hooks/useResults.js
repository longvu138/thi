import { useQuery } from '@tanstack/react-query';
import { resultsApi } from '../api/resultsApi';
export const useAttemptResult = id => useQuery({queryKey:['results','attempt',id],queryFn:({signal})=>resultsApi.get(id,signal),staleTime:0,refetchOnMount:'always'});
export const useMyResults = params => useQuery({queryKey:['results','mine',params],queryFn:({signal})=>resultsApi.list(params,signal),staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:true,refetchInterval:30000});

// Dùng API lịch sử hiện có, đọc đủ các trang để không bỏ sót lượt cao nhất.
export const useRoundAttemptHistory=(examRoundId,enabled=true)=>useQuery({
 queryKey:['results','round-history',examRoundId],enabled:Boolean(examRoundId)&&enabled,
 queryFn:async({signal})=>{const rows=[];let page=1;while(true){const data=await resultsApi.list({examRoundId,page,limit:100},signal);rows.push(...data.items);if(!data.items.length||rows.length>=data.pagination.total)return rows;page++;}},
 staleTime:0,refetchOnMount:'always',
});
