import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {structureApi} from '../api/structureApi';
export const useStructure=(id,enabled=true)=>useQuery({queryKey:['structure',id],queryFn:()=>structureApi.get(id),enabled:Boolean(id)&&enabled});
export const useStructureMutations=id=>{
 const client=useQueryClient();return {
  save:useMutation({mutationFn:body=>structureApi.save(id,body),onSuccess:()=>Promise.all([client.invalidateQueries({queryKey:['structure',id]}),client.invalidateQueries({queryKey:['exam-rounds']})])}),
  preview:useMutation({mutationFn:body=>structureApi.preview(id,body)}),
 };
};
