import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {structureApi} from '../api/structureApi';
export const useStructure=id=>useQuery({queryKey:['structure',id],queryFn:()=>structureApi.get(id)});
export const useStructureMutations=id=>{
 const client=useQueryClient();return {
  save:useMutation({mutationFn:body=>structureApi.save(id,body),onSuccess:()=>Promise.all([client.invalidateQueries({queryKey:['structure',id]}),client.invalidateQueries({queryKey:['exam-rounds']})])}),
  preview:useMutation({mutationFn:body=>structureApi.preview(id,body)}),
 };
};
