import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {PgBoss} from 'pg-boss';
import {z} from 'zod';
import {DomainError} from '../../domain/src/errors';
import {enqueue,withTransaction,type JobHandler} from './jobs';
import {SHOPIFY_SCOPES,shopDomain} from './shopify-oauth';
import {shopifyError} from './shopify-http';
export const LIFECYCLE_TOPICS=['app/uninstalled','app/scopes_update'] as const;
type Topic=typeof LIFECYCLE_TOPICS[number];
/** A per-installation callback URL binds Shopify's body HMAC to store, generation and topic. Never expose its key in the browser. */
export function webhookRouteKey(secret:string,storeId:string,generation:number,topic:Topic){return createHmac('sha256',secret).update(JSON.stringify(['shopify-webhook-route-v1',storeId,generation,topic])).digest('hex');}
export function lifecycleWebhookUrls(appUrl:string,secret:string,storeId:string,generation:number){
 return LIFECYCLE_TOPICS.map(topic=>({topic,url:new URL(`/api/shopify/webhooks/${encodeURIComponent(storeId)}/${generation}/${topic==='app/uninstalled'?'uninstalled':'scopes'}?key=${webhookRouteKey(secret,storeId,generation,topic)}`,appUrl).toString()}));
}
export function validWebhookHmac(body:Uint8Array,hmac:string|null,secret:string){
 if(!hmac||!(/^[A-Za-z0-9+/]{43}=$/).test(hmac))return false;
 const expected=createHmac('sha256',secret).update(body).digest();const received=Buffer.from(hmac,'base64');
 return received.length===expected.length&&timingSafeEqual(received,expected);
}
async function rawBody(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new DomainError('invalid_request');
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([(async()=>{let bytes=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>65536)throw new DomainError('invalid_request');chunks.push(value);}return Buffer.concat(chunks);})(),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{void reader.cancel();reject(new DomainError('invalid_request'));},2000);})]);}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});}
}
const payloadSchema=z.object({storeId:z.string().min(1),generation:z.number().int().positive(),topic:z.enum(LIFECYCLE_TOPICS)}).strict();
export const shopifyLifecycleHandlers:Readonly<Record<string,JobHandler>>={
 'shopify.lifecycle':async(tx,payload,identity)=>{
  const parsed=payloadSchema.safeParse(payload);if(!parsed.success)throw new DomainError('invalid_request');const input=parsed.data;
  const {rows:[store]}=await tx.query<{generation:number;status:string}>(`SELECT "generation","status" FROM "ShopInstallation" WHERE "id"=$1 AND "workspaceId"=$2 FOR UPDATE`,[input.storeId,identity.workspaceId]);
  if(!store||store.generation!==input.generation)return;
  if(input.topic==='app/uninstalled'&&store.status==='uninstall_pending'){
   await tx.query(`UPDATE "ShopInstallation" SET "status"='uninstalled',"encryptedToken"=NULL,"encryptedRefreshToken"=NULL,"tokenExpiresAt"=NULL,"refreshTokenExpiresAt"=NULL,"keyVersion"=NULL WHERE "id"=$1`,[input.storeId]);
  }
  await tx.query('INSERT INTO "AuditRecord" ("id","workspaceId","actorId","action","objectId") VALUES ($1,$2,\'shopify-webhook\',$3,$4)',[randomUUID(),identity.workspaceId,input.topic,input.storeId]);
 }
};
export async function lifecycleWebhook(request:Request,input:{pool:Pool;boss:PgBoss;secret:string;storeId:string;generation:number;kind:string;prepareQueue?:()=>Promise<void>}){
 try{
  const topic:Topic=input.kind==='uninstalled'?'app/uninstalled':input.kind==='scopes'?'app/scopes_update':(()=>{throw new DomainError('invalid_request');})();
  if(!input.secret||!Number.isSafeInteger(input.generation)||input.generation<1)throw new DomainError('unauthorised');
  const params=new URL(request.url).searchParams;const key=params.getAll('key');
  const expected=webhookRouteKey(input.secret,input.storeId,input.generation,topic);
  if(key.length!==1||!(/^[a-f0-9]{64}$/).test(key[0])||!timingSafeEqual(Buffer.from(expected),Buffer.from(key[0])))throw new DomainError('unauthorised');
  if(request.headers.get('x-shopify-topic')!==topic)throw new DomainError('unauthorised');
  const domain=shopDomain(request.headers.get('x-shopify-shop-domain'));
  const eventId=request.headers.get('x-shopify-webhook-id');if(!eventId||!(/^[a-zA-Z0-9_-]{1,128}$/).test(eventId))throw new DomainError('invalid_request');
  const body=await rawBody(request);if(!validWebhookHmac(body,request.headers.get('x-shopify-hmac-sha256'),input.secret))throw new DomainError('unauthorised');
  let data:unknown;try{data=JSON.parse(body.toString('utf8'));}catch{throw new DomainError('invalid_request');}
  const parsed=topic==='app/uninstalled'?z.object({id:z.union([z.string(),z.number().int().positive()]),myshopify_domain:z.string().nullable().optional()}).safeParse(data):z.object({current:z.array(z.string().regex(/^[a-z_]+$/)).max(100),previous:z.array(z.string()).max(100)}).safeParse(data);
  if(!parsed.success)throw new DomainError('invalid_request');
  if('myshopify_domain' in parsed.data&&parsed.data.myshopify_domain&&parsed.data.myshopify_domain!==domain)throw new DomainError('unauthorised');
  await input.prepareQueue?.();
  await withTransaction(input.pool,async tx=>{
   const {rows:[store]}=await tx.query<{workspaceId:string;shopDomain:string;generation:number;status:string}>(`SELECT "workspaceId","shopDomain","generation","status" FROM "ShopInstallation" WHERE "id"=$1 FOR UPDATE`,[input.storeId]);
   if(!store||store.shopDomain!==domain)throw new DomainError('not_found');
   // A delayed delivery to a prior generation is acknowledged without touching the new installation.
   if(store.generation!==input.generation)return;
   const idempotencyKey=`shopify-lifecycle:${input.storeId}:${input.generation}:${eventId}`;
   const minimal={storeId:input.storeId,generation:input.generation,topic};
   const prior=await tx.query('SELECT "topic" FROM "WebhookReceipt" WHERE "storeId"=$1 AND "installationGeneration"=$2 AND "providerEventId"=$3',[input.storeId,input.generation,eventId]);
   if(prior.rowCount){if(prior.rows[0].topic!==topic)throw new DomainError('conflict');return;}
   const outboxId=await enqueue(tx,input.boss,{workspaceId:store.workspaceId,kind:'shopify.lifecycle',idempotencyKey,payload:minimal});
   await tx.query('INSERT INTO "WebhookReceipt" ("storeId","installationGeneration","providerEventId","topic","outboxId") VALUES ($1,$2,$3,$4,$5)',[input.storeId,input.generation,eventId,topic,outboxId]);
   // Disable new provider operations/serving immediately in the receipt transaction; cleanup can retry later.
   if(topic==='app/uninstalled')await tx.query(`UPDATE "ShopInstallation" SET "status"='uninstall_pending' WHERE "id"=$1`,[input.storeId]);
   else if('current' in parsed.data&&store.status==='installed'){
    const current=parsed.data.current;const complete=SHOPIFY_SCOPES.every(scope=>current.includes(scope));
    await tx.query('UPDATE "ShopInstallation" SET "scopes"=$2,"status"=$3 WHERE "id"=$1',[input.storeId,current,complete?'installed':'scope_limited']);
   }
   const {rows:[current]}=await tx.query<{status:string}>('SELECT "status" FROM "ShopInstallation" WHERE "id"=$1',[input.storeId]);
   if(current.status!=='installed'){
    await tx.query(`UPDATE "Publication" SET "status"='inactive' WHERE "storeId"=$1 AND "status"='active'`,[input.storeId]);
    await tx.query(`UPDATE "Experiment" SET "status"='paused',"version"="version"+1 WHERE "storeId"=$1 AND "status"='running'`,[input.storeId]);
   }
  });
  return new Response(null,{status:200,headers:{'Cache-Control':'no-store'}});
 }catch(error){return shopifyError(error);}
}
