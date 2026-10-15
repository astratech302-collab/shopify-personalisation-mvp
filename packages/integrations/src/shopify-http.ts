import type {Pool} from 'pg';
import {z} from 'zod';
import {DomainError,toSafeError} from '../../domain/src/errors';
import {beginShopify,completeShopify,type ShopifyConfig} from './shopify-oauth';
import {requireWorkspace,requireSameOrigin} from './workspaces';
import type {SessionResolver} from './merchant-http';
export const SHOPIFY_STATE_COOKIE='shopify_connection_browser';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export function shopifyError(error:unknown){
 const safe=error instanceof DomainError?error:new DomainError('storage_unavailable',true);
 const status=safe.code==='unauthorised'?401:safe.code==='not_found'?404:safe.code==='conflict'?409:safe.code==='rate_limited'?429:safe.code==='provider_unavailable'||safe.code==='storage_unavailable'?503:400;
 return Response.json(toSafeError(safe),{status,headers});
}
export async function smallJson(request:Request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new DomainError('invalid_request');
 const reader=request.body?.getReader();if(!reader)throw new DomainError('invalid_request');
 let timer:ReturnType<typeof setTimeout>|undefined;const chunks:Uint8Array[]=[];let size=0;
 try{return await Promise.race([(async()=>{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096)throw new DomainError('invalid_request');chunks.push(value);}try{return JSON.parse(Buffer.concat(chunks).toString()) as unknown;}catch{throw new DomainError('invalid_request');}})(),new Promise<never>((_r,reject)=>{timer=setTimeout(()=>{void reader.cancel();reject(new DomainError('invalid_request'));},5000);})]);}finally{clearTimeout(timer);await reader.cancel().catch(()=>{});}
}
function cookie(value:string,maxAge:number){return `${SHOPIFY_STATE_COOKIE}=${value}; Path=/api/shopify/callback; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;}
export function shopifyHttp(pool:Pool,session:SessionResolver,config:ShopifyConfig){
 return {
  async connect(request:Request,workspaceId:string){try{
   const identity=await session();if(!identity)throw new DomainError('unauthorised');
   requireSameOrigin(request.headers.get('origin'),config.appUrl);
   const input=z.object({shop:z.string().max(253)}).strict().safeParse(await smallJson(request));if(!input.success)throw new DomainError('invalid_request');
   const result=await beginShopify(pool,config,identity,workspaceId,input.data.shop);
   return Response.json({schemaVersion:1,data:{authorizationUrl:result.authorizationUrl}},{headers:{...headers,'Set-Cookie':cookie(result.browser,600)}});
  }catch(error){return shopifyError(error);}},
  async status(workspaceId:string){try{
   const identity=await session();if(!identity)throw new DomainError('unauthorised');await requireWorkspace(pool,identity.userId,workspaceId);
   const {rows:[row]}=await pool.query('SELECT "id","shopDomain","status","scopes","tokenExpiresAt","refreshTokenExpiresAt" FROM "ShopInstallation" WHERE "workspaceId"=$1',[workspaceId]);
   return Response.json({schemaVersion:1,data:row??null},{headers});
  }catch(error){return shopifyError(error);}},
  async callback(request:Request){try{
   const identity=await session();if(!identity)throw new DomainError('unauthorised');
   if(request.url.length>8192)throw new DomainError('invalid_request');
   const cookies=request.headers.get('cookie')?.split(';').map(v=>v.trim()).filter(v=>v.startsWith(SHOPIFY_STATE_COOKIE+'='))??[];
   const browser=cookies.length===1?cookies[0].slice(SHOPIFY_STATE_COOKIE.length+1):undefined;
   await completeShopify(pool,config,identity,new URL(request.url).searchParams,browser);
   const target=new URL('/account',config.appUrl);target.searchParams.set('shopify','connected');
   return new Response(null,{status:303,headers:{...headers,Location:target.toString(),'Set-Cookie':cookie('',0)}});
  }catch(error){const response=shopifyError(error);response.headers.set('Set-Cookie',cookie('',0));return response;}}
 };
}
