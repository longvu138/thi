import {useQuery,useMutation} from '@tanstack/react-query';
import {receiptsApi} from '../api/receiptsApi';
export const useAttemptReceipt=id=>useQuery({queryKey:['receipts','attempt',id],queryFn:({signal})=>receiptsApi.get(id,signal),enabled:Boolean(id),retry:false});
export const useReceiptLookup=()=>useMutation({mutationFn:receiptsApi.lookup});
