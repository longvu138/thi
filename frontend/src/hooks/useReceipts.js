import {useQuery,useMutation} from '@tanstack/react-query';
import {receiptsApi} from '../api/receiptsApi';
export const useAttemptReceipt=(id,admin=false)=>useQuery({queryKey:['receipts','attempt',admin,id],queryFn:({signal})=>admin?receiptsApi.adminGet(id,signal):receiptsApi.get(id,signal),enabled:Boolean(id),retry:false});
export const useReceiptLookup=()=>useMutation({mutationFn:receiptsApi.lookup});
