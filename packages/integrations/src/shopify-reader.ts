import '@shopify/shopify-api/adapters/node';
import {shopifyApi,ApiVersion,Session,LogSeverity} from '@shopify/shopify-api';
import {DomainError} from '../../domain/src/errors';
import {ProviderError,classifyStatus} from './provider-http';
type Requester={request(query:string,options:{variables?:Record<string,unknown>;retries:number;signal:AbortSignal}):Promise<unknown>};
export function wrapShopifyReader(client:Requester,timeoutMs=5000){
 if(timeoutMs<1||timeoutMs>30000)throw new DomainError('invalid_request');
 return {async query(operation:string,variables?:Record<string,unknown>){
  if(!/^\s*query\b/.test(operation))throw new DomainError('invalid_request');
  try{return await client.request(operation,{variables,retries:0,signal:AbortSignal.timeout(timeoutMs)});}
  catch(error){
   // Never retain raw SDK errors, headers, query variables, response body or cause.
   const value=error&&typeof error==='object'?error as {response?:{code?:number;status?:number};body?:{errors?:{graphQLErrors?:{extensions?:{code?:string}}[]}}}:{};
   if(value.body?.errors?.graphQLErrors?.some(e=>e.extensions?.code==='THROTTLED'))throw new ProviderError('rate_limited',true);
   const status=value.response?.code??value.response?.status;
   throw typeof status==='number'?classifyStatus(status):new ProviderError('provider_unavailable',true);
  }
 }};
}
export function createShopifyReader(input:{apiKey:string;apiSecret:string;appHost:string;shop:string;token:string;timeoutMs?:number}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(input.shop)||!input.token)throw new DomainError('invalid_request');
 const api=shopifyApi({apiKey:input.apiKey,apiSecretKey:input.apiSecret,hostName:input.appHost,apiVersion:ApiVersion.October26,isEmbeddedApp:false,logger:{level:LogSeverity.Error,log:()=>{},httpRequests:false}});
 const session=new Session({id:`offline_${input.shop}`,shop:input.shop,state:'',isOnline:false,accessToken:input.token});
 return wrapShopifyReader(new api.clients.Graphql({session}),input.timeoutMs);
}
