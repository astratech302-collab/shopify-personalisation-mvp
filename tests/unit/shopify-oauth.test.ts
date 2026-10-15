import {it,expect,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {shopDomain,validShopifyCallback,tokenRequest,SHOPIFY_SCOPES,type ShopifyConfig} from '../../packages/integrations/src/shopify-oauth';
import {SecretVault} from '../../packages/integrations/src/secrets';
import {readEnv} from '../../packages/integrations/src/env';
import {shopifyHttp} from '../../packages/integrations/src/shopify-http';
import type {Pool} from 'pg';
const config:ShopifyConfig={apiKey:'a'.repeat(32),apiSecret:'b'.repeat(32),appUrl:'https://app.example',vault:new SecretVault({1:Buffer.alloc(32,1).toString('base64')},1),keyVersion:1};
function signed(extra:Record<string,string>={}){const params=new URLSearchParams({shop:'test.myshopify.com',code:'fixture-code',state:'a'.repeat(43),timestamp:String(Math.floor(Date.now()/1000)),...extra});params.sort();params.set('hmac',createHmac('sha256',config.apiSecret).update(params.toString().replace(/\+/g,'%20')).digest('hex'));return params;}
it.each(['https://test.myshopify.com','test.myshopify.com.evil.example','test.myshopify.com:443','test.myshopify.com/path','test@evil.myshopify.com','-test.myshopify.com','test-.myshopify.com','TEST.myshopify.com','127.0.0.1'])('rejects noncanonical shop host %s',value=>{expect(()=>shopDomain(value)).toThrow();});
it('uses official SDK HMAC checks and rejects duplicate, stale and tampered callbacks',async()=>{
 expect(await validShopifyCallback(signed(),config)).toBe(true);
 const tampered=signed();tampered.set('code','different');expect(await validShopifyCallback(tampered,config)).toBe(false);
 const duplicated=signed();duplicated.append('shop','other.myshopify.com');expect(await validShopifyCallback(duplicated,config)).toBe(false);
 expect(await validShopifyCallback(signed({timestamp:'1'}),config)).toBe(false);
 expect(await validShopifyCallback(signed({timestamp:String(Math.floor(Date.now()/1000)+3600)}),config)).toBe(false);
 expect(await validShopifyCallback(signed({shop:'test.myshopify.com.evil.example'}),config)).toBe(false);
});
it('requests expiring offline tokens with bounded transport and accepts only required scopes',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,refresh_token_expires_in:7776000,scope:SHOPIFY_SCOPES.join(',')}));
 expect((await tokenRequest({...config,fetch:request},'test.myshopify.com',{code:'fixture-code'})).expires_in).toBe(3600);
 const [url,options]=request.mock.calls[0];expect(url).toBe('https://test.myshopify.com/admin/oauth/access_token');expect(options!.redirect).toBe('error');expect(options!.signal).toBeInstanceOf(AbortSignal);expect(JSON.parse(options!.body as string).expiring).toBe(1);
 const bad=vi.fn<typeof fetch>().mockResolvedValue(Response.json({access_token:'private-token',refresh_token:'private-refresh',expires_in:3600,refresh_token_expires_in:7776000,scope:'read_products,write_orders'}));
 await expect(tokenRequest({...config,fetch:bad},'test.myshopify.com',{code:'x'})).rejects.toMatchObject({code:'provider_rejected'});
});
it.each([401,429,500])('sanitises failed token exchange HTTP %s',async status=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response('private-token',{status}));
 await expect(tokenRequest({...config,fetch:request},'test.myshopify.com',{code:'x'})).rejects.toMatchObject({code:status===401?'provider_rejected':status===429?'rate_limited':'provider_unavailable',retryable:status!==401});
});
it('rejects oversized token bodies and network failures without secret messages',async()=>{
 await expect(tokenRequest({...config,fetch:async()=>new Response('x'.repeat(16385))},'test.myshopify.com',{code:'x'})).rejects.toMatchObject({code:'provider_rejected'});
 await expect(tokenRequest({...config,fetch:async()=>{throw new Error('private-token');}},'test.myshopify.com',{code:'x'})).rejects.toThrow('The provider is temporarily unavailable.');
});
it('enables Shopify independently without Meta while requiring HTTPS, Clerk and a valid encryption key',()=>{
 const env={DATABASE_URL:'postgresql://localhost/test',APP_URL:'https://app.example',INTEGRATIONS_MODE:'disabled',SHOPIFY_INTEGRATION_MODE:'enabled',AUTH_MODE:'clerk',SHOPIFY_API_KEY:'fixture-key',SHOPIFY_API_SECRET:'fixture-secret',CLERK_SECRET_KEY:'fixture-clerk',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'fixture-publishable',TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64'),TOKEN_ENCRYPTION_KEY_VERSION:'1'};
 expect(readEnv(env).SHOPIFY_INTEGRATION_MODE).toBe('enabled');
 expect(()=>readEnv({...env,APP_URL:'http://app.example'})).toThrow(/HTTPS/);
 expect(()=>readEnv({...env,AUTH_MODE:'disabled'})).toThrow(/AUTH_MODE/);
 expect(()=>readEnv({...env,TOKEN_ENCRYPTION_KEY:'invalid'})).toThrow(/TOKEN_ENCRYPTION_KEY/);
});
it('rejects unauthenticated and cross-origin requests before database work',async()=>{
 const pool={query:vi.fn(),connect:vi.fn()} as unknown as Pool;
 const api=shopifyHttp(pool,async()=>null,config);expect((await api.status('copied')).status).toBe(401);expect((await api.callback(new Request('https://app.example/api/shopify/callback'))).status).toBe(401);
 const signedIn=shopifyHttp(pool,async()=>({userId:'owner',sessionId:'verified-session'}),config);
 const response=await signedIn.connect(new Request('https://app.example/connect',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({shop:'test.myshopify.com'})}),'workspace');expect(response.status).toBe(401);expect(pool.connect).not.toHaveBeenCalled();
});
