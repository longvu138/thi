import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {guideApi} from '../api/guideApi';
export const useGuide=()=>useQuery({queryKey:['guide'],queryFn:guideApi.get});
export const useSaveGuide=()=>{const client=useQueryClient();return useMutation({mutationFn:guideApi.save,onSuccess:data=>client.setQueryData(['guide'],data)});};
