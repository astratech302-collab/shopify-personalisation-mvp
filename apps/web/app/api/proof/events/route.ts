import {proofEnvelope} from '../../../../../../packages/contracts/src/proof';
import {createDatabase} from '../../../../../../packages/database/src/client';
export const dynamic='force-dynamic';
function headers(){return {'Cache-Control':'no-store','Access-Control-Allow-Origin':process.env.PROOF_STOREFRONT_ORIGIN??'http://localhost:3000','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};}
export function OPTIONS(){return new Response(null,{status:204,headers:headers()});}
export async function POST(request:Request){
 if(process.env.PROOF_MODE!=='true'||process.env.NODE_ENV==='production')return new Response(null,{status:404});
 if(Number(request.headers.get('content-length')??0)>8192)return new Response(null,{status:413,headers:headers()});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400,headers:headers()});
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return new Response(null,{status:413,headers:headers()});}chunks.push(value);}
 let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return new Response(null,{status:400,headers:headers()});}
 const parsed=proofEnvelope.safeParse(input);
 if(!parsed.success)return Response.json({error:'invalid_proof_event'},{status:400,headers:headers()});
 const event=parsed.data;
 if(event.storeId!==(process.env.PROOF_STORE_ID??'fixture-store'))return Response.json({error:'unknown_proof_store'},{status:400,headers:headers()});
 if(Math.abs(Date.now()-Date.parse(event.occurredAt))>7*86400000)return Response.json({error:'invalid_timestamp'},{status:400,headers:headers()});
 // IDs are scoped by store and source. Custom republishing retains its app ID.
 const logicalId=event.kind==='checkout_completed'?event.eventId:event.custom.eventId;
 const key=JSON.stringify([event.storeId,event.kind,logicalId]);
 const db=createDatabase(process.env.DATABASE_URL!);
 try{await db.proofEvent.upsert({where:{id:key},create:{id:key,storeId:event.storeId,clientId:event.clientId,kind:event.kind,occurredAt:new Date(event.occurredAt),payload:event},update:{}});return Response.json({accepted:true,environment:'proof'},{status:202,headers:headers()});}
 catch{return Response.json({error:'retryable_storage_failure'},{status:503,headers:headers()});}
 finally{await db.$disconnect();}
}
