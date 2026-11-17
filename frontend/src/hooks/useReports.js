import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi,adminAttemptsApi } from '../api/reportsApi';
export const useRoundReport=(id,params,options={})=>useQuery({queryKey:['reports',id,'results',params],queryFn:({signal})=>reportsApi.results(id,params,signal),staleTime:0,...options});
export const useQuestionReport=(id,params,options={})=>useQuery({queryKey:['reports',id,'questions',params],queryFn:({signal})=>reportsApi.questions(id,params,signal),staleTime:0,...options});
export const useReportActions=()=>{const client=useQueryClient();return {
 exportFile:useMutation({mutationFn:({id,params})=>reportsApi.export(id,params)}),
 clearTrial:useMutation({mutationFn:reportsApi.clearTrial,onSuccess:()=>{client.invalidateQueries({queryKey:['admin-attempt-history']});client.invalidateQueries({queryKey:['admin-attempt']});client.invalidateQueries({queryKey:['reports']});client.invalidateQueries({queryKey:['exam-rounds']});client.invalidateQueries({queryKey:['structure']});client.invalidateQueries({queryKey:['results']});client.invalidateQueries({queryKey:['attempts']});}}),
};};

export const useCommitteeReport=(id,params)=>useQuery({queryKey:['reports',id,'committees',params],queryFn:({signal})=>reportsApi.committees(id,params,signal)});
export const useAdminHistory=(roundId,userId,params)=>useQuery({queryKey:['admin-attempt-history',roundId,userId,params],queryFn:({signal})=>adminAttemptsApi.history(roundId,userId,params,signal),enabled:Boolean(roundId&&userId)});
export const useAdminAttempt=id=>useQuery({queryKey:['admin-attempt',id],queryFn:({signal})=>adminAttemptsApi.get(id,signal),enabled:Boolean(id),staleTime:0});
