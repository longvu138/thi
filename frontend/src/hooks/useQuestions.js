import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {questionsApi} from '../api/questionsApi';
export const useQuestions=(roundId,params)=>useQuery({queryKey:['questions',roundId,params],queryFn:()=>questionsApi.list(roundId,params)});
export const useQuestionCategories=(roundId,params)=>useQuery({queryKey:['question-categories',roundId,params],queryFn:()=>questionsApi.categories(roundId,params)});
export const useQuestionMutations=roundId=>{
 const client=useQueryClient();
 const invalidate=()=>Promise.all([client.invalidateQueries({queryKey:['structure',roundId]}),client.invalidateQueries({queryKey:['exam-rounds']}),client.invalidateQueries({queryKey:['questions',roundId]}),client.invalidateQueries({queryKey:['question-categories',roundId]})]);
 return {
  create:useMutation({mutationFn:body=>questionsApi.create(roundId,body),onSuccess:invalidate}),
  update:useMutation({mutationFn:payload=>questionsApi.update(roundId,payload),onSuccess:invalidate}),
  remove:useMutation({mutationFn:id=>questionsApi.remove(roundId,id),onSuccess:invalidate}),
  import:useMutation({mutationFn:payload=>questionsApi.import(roundId,payload),onSuccess:(_,variables)=>variables.mode==='commit'?invalidate():undefined}),
  export:useMutation({mutationFn:()=>questionsApi.export(roundId)}),
  template:useMutation({mutationFn:questionsApi.template}),
 };
};
