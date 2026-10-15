import {DomainError} from '../../domain/src/errors';
export class ProviderError extends DomainError{
 constructor(code:'provider_unavailable'|'provider_rejected'|'rate_limited',retryable:boolean){super(code,retryable);this.name='ProviderError';}
}
export function classifyStatus(status:number):ProviderError{return status===429?new ProviderError('rate_limited',true):status>=500?new ProviderError('provider_unavailable',true):new ProviderError('provider_rejected',false);}
/** Only fixed read endpoints; no caller-controlled hosts or pagination URLs. Tokens use headers. */
export function createMetaReader(options:{version:string;token:string;timeoutMs?:number;fetch?:typeof fetch}){
 if(!/^v[0-9]{1,2}\.0$/.test(options.version)||!options.token)throw new DomainError('invalid_request');
 const timeout=options.timeoutMs??5000;if(timeout<1||timeout>30000)throw new DomainError('invalid_request');
 const request=options.fetch??fetch;
 return {async get(path:string,params:Readonly<Record<string,string>>={}){
  if(!/^(?:me|act_[0-9]+|[0-9]+)(?:\/(?:adaccounts|campaigns|adsets|ads|insights))?$/.test(path)||Object.keys(params).some(k=>!['fields','limit','after','before','since','until','time_range','date_preset','level','time_increment'].includes(k)))throw new DomainError('invalid_request');
  const url=new URL(`https://graph.facebook.com/${options.version}/${path}`);for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  try{
   const response=await request(url,{method:'GET',headers:{Authorization:`Bearer ${options.token}`},redirect:'error',signal:AbortSignal.timeout(timeout)});
   if(!response.ok)throw classifyStatus(response.status);
   const data:unknown=await response.json();
   if(data&&typeof data==='object'&&'error' in data){const error=(data as {error:unknown}).error;const code=error&&typeof error==='object'&&'code' in error?(error as {code:unknown}).code:undefined;throw [4,17,32,613].includes(Number(code))?new ProviderError('rate_limited',true):new ProviderError('provider_rejected',false);}
   return data;
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('provider_unavailable',true);}
 }};
}
