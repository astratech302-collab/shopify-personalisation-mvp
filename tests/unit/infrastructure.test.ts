import {it,expect,vi} from 'vitest';
import {SecretVault} from '../../packages/integrations/src/secrets';
import {createMetaReader,ProviderError} from '../../packages/integrations/src/provider-http';
import {wrapShopifyReader} from '../../packages/integrations/src/shopify-reader';
import {toSafeError} from '../../packages/domain/src/errors';
const key=Buffer.alloc(32,1).toString('base64');
it('authenticated encryption binds token to tenant/provider and supports key rotation',()=>{const old=new SecretVault({1:key},1);const encrypted=old.seal('private-token','workspace1:shopify');expect(encrypted).not.toContain('private-token');const rotated=new SecretVault({1:key,2:Buffer.alloc(32,2).toString('base64')},2);expect(rotated.open(encrypted,'workspace1:shopify')).toBe('private-token');expect(()=>rotated.open(encrypted,'workspace2:shopify')).toThrow();const tampered=JSON.parse(encrypted);tampered.data=Buffer.from('modified').toString('base64');expect(()=>old.open(JSON.stringify(tampered),'workspace1:shopify')).toThrow();expect(()=>new SecretVault({2:Buffer.alloc(32,2).toString('base64')},2).open(encrypted,'workspace1:shopify')).toThrow();});
it('rejects malformed keys and encrypted envelopes without leaking data',()=>{expect(()=>new SecretVault({1:'bad'},1)).toThrow();const vault=new SecretVault({1:key},1);try{vault.open('private-token','tenant');}catch(error){expect(JSON.stringify(toSafeError(error))).not.toContain('private-token');}});
it.each([429,500,503,401,403])('classifies Meta HTTP %s and keeps credentials out of errors',async status=>{const request=vi.fn<typeof fetch>().mockResolvedValue(new Response('{"error":"token=private-token"}',{status}));const client=createMetaReader({version:'v99.0',token:'private-token',fetch:request});try{await client.get('act_123/ads',{fields:'id'});throw new Error('expected rejection');}catch(error){expect(error).toBeInstanceOf(ProviderError);expect((error as ProviderError).retryable).toBe(status===429||status>=500);expect(JSON.stringify(toSafeError(error))).not.toContain('private-token');}const [url,options]=request.mock.calls[0];expect(String(url)).not.toContain('private-token');expect(options!.redirect).toBe('error');});
it('maps a simulated Meta throttle body, rejects external pagination URLs',async()=>{const request=vi.fn<typeof fetch>().mockResolvedValue(Response.json({error:{code:4,message:'sensitive'}}));const client=createMetaReader({version:'v99.0',token:'secret',fetch:request});await expect(client.get('me/adaccounts')).rejects.toMatchObject({code:'rate_limited',retryable:true});await expect(client.get('https://evil.example')).rejects.toMatchObject({code:'invalid_request'});});
it('aborts a provider request at its deadline',async()=>{const request:typeof fetch=async(_url,options)=>new Promise((_resolve,reject)=>{options!.signal!.addEventListener('abort',()=>reject(new Error('private-token')));});const client=createMetaReader({version:'v99.0',token:'private-token',timeoutMs:10,fetch:request});await expect(client.get('me')).rejects.toMatchObject({code:'provider_unavailable',retryable:true});});
it('uses the Shopify SDK request signal, disables nested retries and sanitises errors',async()=>{const request=vi.fn().mockRejectedValue({response:{code:429},body:{accessToken:'secret'}});const client=wrapShopifyReader({request});await expect(client.query('query { shop { id } }')).rejects.toMatchObject({code:'rate_limited',retryable:true});expect(request.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);expect(request.mock.calls[0][1].retries).toBe(0);await expect(client.query('mutation { something }')).rejects.toMatchObject({code:'invalid_request'});});
it('actual Shopify SDK honours timeout and sanitises GraphQL rejection with a fixture transport',async()=>{
 const {setAbstractFetchFunc}=await import('@shopify/shopify-api/runtime');
 const {createShopifyReader}=await import('../../packages/integrations/src/shopify-reader');
 const options={apiKey:'a'.repeat(32),apiSecret:'b'.repeat(32),appHost:'app.example',shop:'fixture.myshopify.com',token:'private-token'};
 const request:typeof fetch=async(_url,input)=>new Promise((_resolve,reject)=>{input!.signal!.addEventListener('abort',()=>reject(new Error('private-token')));});
 setAbstractFetchFunc(request);
 try{
  await expect(createShopifyReader({...options,timeoutMs:10}).query('query { shop { id } }')).rejects.toMatchObject({code:'provider_unavailable',retryable:true});
  setAbstractFetchFunc(async()=>Response.json({errors:[{message:'private-token',extensions:{code:'ACCESS_DENIED'}}]}));
  await expect(createShopifyReader(options).query('query { shop { id } }')).rejects.toMatchObject({code:'provider_rejected',retryable:false});
 }finally{setAbstractFetchFunc(globalThis.fetch);}
});
it('merchant authentication can be configured independently of Shopify and Meta',async()=>{
 const {readEnv}=await import('../../packages/integrations/src/env');
 const base={DATABASE_URL:'postgresql://localhost/test',APP_URL:'http://localhost:3000',INTEGRATIONS_MODE:'disabled',AUTH_MODE:'clerk'};
 expect(()=>readEnv(base)).toThrow(/CLERK_SECRET_KEY/);
 expect(readEnv({...base,CLERK_SECRET_KEY:'fixture-only',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'fixture-only'}).AUTH_MODE).toBe('clerk');
});
