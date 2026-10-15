import type {Pool} from 'pg';
import {DomainError,toSafeError} from '../../domain/src/errors';
import {ingest,INGESTION_LIMITS} from './ingestion';
const headers={'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
export function eventOptions(){return new Response(null,{status:204,headers});}
export async function eventPost(request:Request,pool:Pool){
 try{
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'json_required'},{status:415,headers});
  if(Number(request.headers.get('content-length')??0)>INGESTION_LIMITS.bodyBytes)return Response.json({error:'body_too_large'},{status:413,headers});
  const reader=request.body?.getReader();if(!reader)throw new DomainError('invalid_request');
  let size=0;const chunks:Uint8Array[]=[];
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{void reader.cancel();reject(new DomainError('invalid_request'));},5000);});
  try{await Promise.race([(async()=>{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>INGESTION_LIMITS.bodyBytes){await reader.cancel();return;}chunks.push(value);}})(),timeout]);}finally{clearTimeout(timer);}
  if(size>INGESTION_LIMITS.bodyBytes)return Response.json({error:'body_too_large'},{status:413,headers});
  let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new DomainError('invalid_request');}
  return Response.json(await ingest(pool,input),{status:202,headers});
 }catch(error){
  const known=error instanceof DomainError;
  const code=known?error.code:'storage_unavailable';
  const status=code==='rate_limited'?429:code==='conflict'?409:known?400:503;
  return Response.json(toSafeError(known?error:new DomainError('storage_unavailable',true)),{status,headers:{...headers,...(status===429?{'Retry-After':'60'}:{})}});
 }
}
