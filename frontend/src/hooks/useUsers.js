import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {usersApi} from '../api/usersApi';
export const useUsers = params => useQuery({queryKey:['users',params],queryFn:()=>usersApi.list(params)});
export const useUserMutations = () => {
 const client=useQueryClient();
 const onSuccess=()=>client.invalidateQueries({queryKey:['users']});
 return {
  template:useMutation({mutationFn:usersApi.template}),
  import:useMutation({mutationFn:usersApi.import,onSuccess:(_,variables)=>variables.mode==='commit'?onSuccess():undefined}),
  create:useMutation({mutationFn:usersApi.create,onSuccess}),
  update:useMutation({mutationFn:usersApi.update,onSuccess}),
  remove:useMutation({mutationFn:usersApi.remove,onSuccess}),
 };
};
