import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examRoundsApi } from '../api/examRoundsApi';
export const useExamRounds = (params, admin = false, options = {}) => useQuery({ queryKey: ['exam-rounds', admin, 'list', params], queryFn: () => examRoundsApi.list({ admin, params }),...options });
export const useExamRound = (id, admin = false, options = {}) => useQuery({ queryKey: ['exam-rounds', admin, 'detail', id], queryFn: () => examRoundsApi.get({ admin, id }), enabled: Boolean(id),...options });
export const useExamRoundMutations = () => {
 const client = useQueryClient();
 const onSuccess = () => client.invalidateQueries({ queryKey: ['exam-rounds'] });
 return {
  create: useMutation({ mutationFn: examRoundsApi.create, onSuccess }),
  update: useMutation({ mutationFn: examRoundsApi.update, onSuccess }),
  remove: useMutation({ mutationFn: examRoundsApi.remove, onSuccess }),
 };
};

export const usePublicExamRounds = page => useQuery({queryKey:['public-exam-rounds',page],queryFn:()=>examRoundsApi.publicList({page,limit:5}),refetchInterval:30000});
