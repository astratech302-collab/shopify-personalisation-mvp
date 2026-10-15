import type {Pool} from 'pg';
import {z} from 'zod';
import {DomainError,toSafeError} from '../../domain/src/errors';
import {ensureFirstWorkspace,requireWorkspace,readExperiment,requireSameOrigin} from './workspaces';
export type SessionResolver=()=>Promise<{userId:string;sessionId:string}|null>;
export function merchantHttp(pool:Pool,session:SessionResolver,appUrl:string){
 async function run(work:(userId:string)=>Promise<unknown>){
  try{const identity=await session();if(!identity?.userId||!identity.sessionId)throw new DomainError('unauthorised');const value=await work(identity.userId);return Response.json({schemaVersion:1,data:value},{headers:{'Cache-Control':'no-store'}});}
  catch(error){const known=error instanceof DomainError;const code=known?error.code:'storage_unavailable';return Response.json(toSafeError(known?error:new DomainError('storage_unavailable',true)),{status:code==='unauthorised'?401:code==='not_found'?404:code==='conflict'?409:known?400:503,headers:{'Cache-Control':'no-store'}});}
 }
 return {
  list:()=>run(async userId=>(await pool.query('SELECT w."id",w."name",m."role" FROM "Workspace" w JOIN "Membership" m ON m."workspaceId"=w."id" WHERE m."userId"=$1 ORDER BY w."createdAt",w."id"',[userId])).rows),
  create:(request:Request)=>run(async userId=>{
   requireSameOrigin(request.headers.get('origin'),appUrl);
   if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new DomainError('invalid_request');
   const reader=request.body?.getReader();if(!reader)throw new DomainError('invalid_request');
   let size=0;const chunks:Uint8Array[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
   const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{void reader.cancel();reject(new DomainError('invalid_request'));},5000);});
   try{await Promise.race([(async()=>{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new DomainError('invalid_request');}chunks.push(value);}})(),timeout]);}finally{clearTimeout(timer);}
   let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new DomainError('invalid_request');}
   const parsed=z.object({name:z.string().trim().min(1).max(80)}).strict().safeParse(input);if(!parsed.success)throw new DomainError('invalid_request');
   return ensureFirstWorkspace(pool,userId,parsed.data.name);
  }),
  workspace:(workspaceId:string)=>run(userId=>requireWorkspace(pool,userId,workspaceId)),
  experiment:(workspaceId:string,experimentId:string)=>run(userId=>readExperiment(pool,userId,workspaceId,experimentId))
 };
}
