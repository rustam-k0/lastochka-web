import 'server-only';
import { session } from './session';
export class ApiError extends Error {constructor(public status:number,public payload:any){super(payload?.message || 'Сервис временно недоступен. Попробуйте ещё раз.');}}
export async function upstream(path:string,init:{method?:string;body?:unknown;token?:string|null}={}){
 const r=await fetch(`${process.env.API_BASE_URL||'https://lastochki.store/api/v1'}/${path}`,{method:init.method||'GET',headers:{Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{}),...(init.token?{Authorization:`Bearer ${init.token}`}:{})},body:init.body?JSON.stringify(init.body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'});
 const data=r.status===204?null:await r.json().catch(()=>({message:'Сервис вернул некорректный ответ'}));if(!r.ok)throw new ApiError(r.status,data);return data;
}
export async function api(path:string){return upstream(path,{token:(await session())?.token});}
export async function selectedStore(){const s=await session();if(s?.token){try{const a=await upstream('addresses/active',{token:s.token});const active=a?.data??a;if(active?.storeId)return Number(active.storeId);if(active?.store?.id)return Number(active.store.id);}catch{/* Selection remains explicit until address is available. */}}return s?.store||Number(process.env.DEFAULT_STORE_ID)||2;}
