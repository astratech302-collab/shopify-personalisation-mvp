import '@shopify/shopify-api/adapters/node';
import {shopifyApi,ApiVersion,LogSeverity} from '@shopify/shopify-api';
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../domain/src/errors';
import {SecretVault} from './secrets';
import {withTransaction} from './jobs';
export const SHOPIFY_SCOPES=['read_products','write_pixels','read_customer_events'] as const;
export type ShopifyConfig={apiKey:string;apiSecret:string;appUrl:string;vault:SecretVault;keyVersion:number;fetch?:typeof fetch};
export type MerchantIdentity={userId:string;sessionId:string};
export const hashOAuthValue=(value:string)=>createHash('sha256').update(value).digest('hex');
export function shopDomain(value:unknown):string {
 if(typeof value!=='string'||value.length>77||!(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/).test(value))throw new DomainError('invalid_request');
 return value;
}
function sdk(config:ShopifyConfig){
 return shopifyApi({apiKey:config.apiKey,apiSecretKey:config.apiSecret,hostName:new URL(config.appUrl).host,apiVersion:ApiVersion.October26,isEmbeddedApp:false,logger:{level:LogSeverity.Error,log:()=>{},httpRequests:false}});
}
export async function validShopifyCallback(params:URLSearchParams,config:ShopifyConfig){
 try{
  const keys=[...params.keys()];if(new Set(keys).size!==keys.length)return false;
  shopDomain(params.get('shop'));
  if(!/^[a-f0-9]{64}$/.test(params.get('hmac')??'')||!/^\d+$/.test(params.get('timestamp')??'')||!params.get('code')||params.get('code')!.length>512||!params.get('state')||!(/^[A-Za-z0-9_-]{43}$/).test(params.get('state')!))return false;
  return await sdk(config).utils.validateHmac(params);
 }catch{return false;}
}
async function readChunk(reader:ReadableStreamDefaultReader<Uint8Array>,signal:AbortSignal){
 let abort:(()=>void)|undefined;
 try{return await Promise.race([reader.read(),new Promise<never>((_resolve,reject)=>{abort=()=>reject(new DomainError('provider_unavailable',true));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});})]);}
 finally{if(abort)signal.removeEventListener('abort',abort);}
}
const tokenSchema=z.object({access_token:z.string().min(1).max(4096),scope:z.string().max(4096),expires_in:z.number().int().positive().max(86400*365),refresh_token:z.string().min(1).max(4096),refresh_token_expires_in:z.number().int().positive().max(86400*365)});
export async function tokenRequest(config:ShopifyConfig,shop:string,grant:{code:string}|{refresh_token:string}){
 shopDomain(shop);
 try{
  const signal=AbortSignal.timeout(8000);
  const response=await (config.fetch??fetch)(`https://${shop}/admin/oauth/access_token`,{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({client_id:config.apiKey,client_secret:config.apiSecret,...grant,...('code' in grant?{expiring:1}:{grant_type:'refresh_token'})})});
  if(!response.ok){await response.body?.cancel();throw new DomainError(response.status===429?'rate_limited':response.status>=500?'provider_unavailable':'provider_rejected',response.status===429||response.status>=500);}
  const reader=response.body?.getReader();if(!reader)throw new DomainError('provider_rejected');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const next=await readChunk(reader,signal);if(next.done)break;size+=next.value.length;if(size>16384)throw new DomainError('provider_rejected');chunks.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
  const parsed=tokenSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  if(!parsed.success)throw new DomainError('provider_rejected');
  const scopes=parsed.data.scope.split(',').map(s=>s.trim()).filter(Boolean);
  if(SHOPIFY_SCOPES.some(s=>!scopes.includes(s))||scopes.some(s=>!SHOPIFY_SCOPES.includes(s as typeof SHOPIFY_SCOPES[number])))throw new DomainError('provider_rejected');
  return {...parsed.data,scopes:[...new Set(scopes)].sort()};
 }catch(error){throw error instanceof DomainError?error:new DomainError('provider_unavailable',true);}
}
async function owner(tx:PoolClient,identity:MerchantIdentity,workspaceId:string){
 if(!identity.userId||!identity.sessionId)throw new DomainError('unauthorised');
 const {rows:[row]}=await tx.query(`SELECT "role" FROM "Membership" WHERE "workspaceId"=$1 AND "userId"=$2 FOR SHARE`,[workspaceId,identity.userId]);
 if(row?.role!=='owner')throw new DomainError('not_found');
}
async function bindingLocks(tx:PoolClient,workspaceId:string,shop:string){
 for(const key of [`shopify:workspace:${workspaceId}`,`shopify:shop:${shop}`].sort())await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[key]);
}
async function checkBinding(tx:PoolClient,workspaceId:string,shop:string){
 const {rows}=await tx.query<{workspaceId:string;shopDomain:string}>(`SELECT "workspaceId","shopDomain" FROM "ShopInstallation" WHERE "workspaceId"=$1 OR "shopDomain"=$2 FOR UPDATE`,[workspaceId,shop]);
 if(rows.some(row=>row.workspaceId!==workspaceId||row.shopDomain!==shop))throw new DomainError('conflict');
}
export async function beginShopify(pool:Pool,config:ShopifyConfig,identity:MerchantIdentity,workspaceId:string,inputShop:unknown){
 const shop=shopDomain(inputShop);const state=randomBytes(32).toString('base64url');const browser=randomBytes(32).toString('base64url');
 await withTransaction(pool,async tx=>{
  await owner(tx,identity,workspaceId);await bindingLocks(tx,workspaceId,shop);await checkBinding(tx,workspaceId,shop);
  await tx.query(`DELETE FROM "ShopifyOAuthAttempt" WHERE "workspaceId"=$1 AND "expiresAt"<CURRENT_TIMESTAMP-INTERVAL '1 day'`,[workspaceId]);
  const count=await tx.query<{count:string}>(`SELECT count(*) FROM "ShopifyOAuthAttempt" WHERE "workspaceId"=$1 AND "expiresAt">CURRENT_TIMESTAMP AND "status" IN ('pending','processing')`,[workspaceId]);
  if(Number(count.rows[0].count)>=10)throw new DomainError('rate_limited',true);
  await tx.query(`INSERT INTO "ShopifyOAuthAttempt" ("stateHash","workspaceId","userId","sessionId","shopDomain","browserHash","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP+INTERVAL '10 minutes')`,[hashOAuthValue(state),workspaceId,identity.userId,identity.sessionId,shop,hashOAuthValue(browser)]);
 });
 const url=new URL(`https://${shop}/admin/oauth/authorize`);url.search=new URLSearchParams({client_id:config.apiKey,scope:SHOPIFY_SCOPES.join(','),redirect_uri:new URL('/api/shopify/callback',config.appUrl).toString(),state}).toString();
 return {authorizationUrl:url.toString(),browser};
}
const context=(workspaceId:string,id:string,kind:string)=>JSON.stringify(['shopify-v1',workspaceId,id,kind]);
type Attempt={workspaceId:string;shopDomain:string;browserHash:string;userId:string;sessionId:string};
export async function completeShopify(pool:Pool,config:ShopifyConfig,identity:MerchantIdentity,params:URLSearchParams,browser:string|undefined){
 if(!identity.userId||!identity.sessionId||!browser||!(/^[A-Za-z0-9_-]{43}$/).test(browser)||!await validShopifyCallback(params,config))throw new DomainError('unauthorised');
 const stateHash=hashOAuthValue(params.get('state')!);const browserHash=hashOAuthValue(browser);
 const attempt=await withTransaction(pool,async tx=>{
  const {rows:[row]}=await tx.query<Attempt&{status:string;active:boolean}>(`SELECT *,"expiresAt">CURRENT_TIMESTAMP AS active FROM "ShopifyOAuthAttempt" WHERE "stateHash"=$1 FOR UPDATE`,[stateHash]);
  if(!row||row.status!=='pending'||!row.active||row.userId!==identity.userId||row.sessionId!==identity.sessionId||row.shopDomain!==params.get('shop')||!timingSafeEqual(Buffer.from(row.browserHash),Buffer.from(browserHash)))throw new DomainError('unauthorised');
  await owner(tx,identity,row.workspaceId);
  await tx.query(`UPDATE "ShopifyOAuthAttempt" SET "status"='processing' WHERE "stateHash"=$1`,[stateHash]);return row;
 });
 try{return await withTransaction(pool,async tx=>{
  await bindingLocks(tx,attempt.workspaceId,attempt.shopDomain);await owner(tx,identity,attempt.workspaceId);await checkBinding(tx,attempt.workspaceId,attempt.shopDomain);
  const token=await tokenRequest(config,attempt.shopDomain,{code:params.get('code')!});
  const {rows:[existing]}=await tx.query<{id:string;generation:number}>(`SELECT "id","generation" FROM "ShopInstallation" WHERE "workspaceId"=$1 FOR UPDATE`,[attempt.workspaceId]);
  const id=existing?.id??randomUUID();const now=Date.now();
  await tx.query(`INSERT INTO "ShopInstallation" ("id","workspaceId","shopDomain","publicId","status","encryptedToken","keyVersion","scopes","tokenExpiresAt","encryptedRefreshToken","refreshTokenExpiresAt") VALUES ($1,$2,$3,$4,'installed',$5,$6,$7,$8,$9,$10) ON CONFLICT ("workspaceId") DO UPDATE SET "status"='installed',"encryptedToken"=EXCLUDED."encryptedToken","keyVersion"=EXCLUDED."keyVersion","scopes"=EXCLUDED."scopes","tokenExpiresAt"=EXCLUDED."tokenExpiresAt","encryptedRefreshToken"=EXCLUDED."encryptedRefreshToken","refreshTokenExpiresAt"=EXCLUDED."refreshTokenExpiresAt","generation"="ShopInstallation"."generation"+1`,[id,attempt.workspaceId,attempt.shopDomain,randomUUID(),config.vault.seal(token.access_token,context(attempt.workspaceId,id,'access')),config.keyVersion,token.scopes,new Date(now+token.expires_in*1000),config.vault.seal(token.refresh_token,context(attempt.workspaceId,id,'refresh')),new Date(now+token.refresh_token_expires_in*1000)]);
  await tx.query(`UPDATE "ShopifyOAuthAttempt" SET "status"='completed',"finishedAt"=CURRENT_TIMESTAMP WHERE "stateHash"=$1`,[stateHash]);
  await tx.query(`INSERT INTO "AuditRecord" ("id","workspaceId","actorId","action","objectId") VALUES ($1,$2,$3,'shopify.connected',$4)`,[randomUUID(),attempt.workspaceId,identity.userId,id]);
  return {workspaceId:attempt.workspaceId,storeId:id,shopDomain:attempt.shopDomain};
 });}catch(error){await pool.query(`UPDATE "ShopifyOAuthAttempt" SET "status"='failed',"finishedAt"=CURRENT_TIMESTAMP WHERE "stateHash"=$1 AND "status"='processing'`,[stateHash]);throw error;}
}
/** Internal provider access only. HTTP callers must first verify current membership. */
export async function shopifyAccessToken(pool:Pool,config:ShopifyConfig,workspaceId:string,storeId:string){
 return withTransaction(pool,async tx=>{
  const {rows:[row]}=await tx.query<{id:string;workspaceId:string;shopDomain:string;status:string;encryptedToken:string|null;encryptedRefreshToken:string|null;tokenExpiresAt:Date|null;refreshTokenExpiresAt:Date|null}>(`SELECT * FROM "ShopInstallation" WHERE "workspaceId"=$1 AND "id"=$2 FOR UPDATE`,[workspaceId,storeId]);
  if(!row||row.status!=='installed'||!row.encryptedToken)throw new DomainError('not_found');
  if(row.tokenExpiresAt&&row.tokenExpiresAt.getTime()>Date.now()+120000)return {shop:row.shopDomain,token:config.vault.open(row.encryptedToken,context(workspaceId,storeId,'access'))};
  if(!row.encryptedRefreshToken||!row.refreshTokenExpiresAt||row.refreshTokenExpiresAt.getTime()<=Date.now())throw new DomainError('provider_rejected');
  const token=await tokenRequest(config,row.shopDomain,{refresh_token:config.vault.open(row.encryptedRefreshToken,context(workspaceId,storeId,'refresh'))});const now=Date.now();
  await tx.query(`UPDATE "ShopInstallation" SET "encryptedToken"=$3,"encryptedRefreshToken"=$4,"tokenExpiresAt"=$5,"refreshTokenExpiresAt"=$6,"scopes"=$7,"keyVersion"=$8 WHERE "workspaceId"=$1 AND "id"=$2`,[workspaceId,storeId,config.vault.seal(token.access_token,context(workspaceId,storeId,'access')),config.vault.seal(token.refresh_token,context(workspaceId,storeId,'refresh')),new Date(now+token.expires_in*1000),new Date(now+token.refresh_token_expires_in*1000),token.scopes,config.keyVersion]);
  return {shop:row.shopDomain,token:token.access_token};
 });
}
