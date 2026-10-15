import {z} from 'zod';
const schema=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),DATABASE_URL:z.url(),APP_URL:z.url(),INTEGRATIONS_MODE:z.enum(['disabled','enabled']),SHOPIFY_INTEGRATION_MODE:z.enum(['disabled','enabled']).default('disabled'),PROOF_MODE:z.enum(['true','false']).default('false'),AUTH_MODE:z.enum(['disabled','clerk']).default('disabled')});
export function readEnv(source:Record<string,string|undefined>){
 const result=schema.safeParse(source);
 if(!result.success) throw new Error(`Invalid environment: ${result.error.issues.map(i=>i.path.join('.')).join(', ')}`);
 if(result.data.NODE_ENV==='production' && result.data.PROOF_MODE==='true') throw new Error('Invalid environment: PROOF_MODE must be false in production');
 if(result.data.AUTH_MODE==='clerk'){const missing=['CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'].filter(k=>!source[k]?.trim());if(missing.length)throw new Error(`Missing environment: ${missing.join(', ')}`);}
 if(result.data.SHOPIFY_INTEGRATION_MODE==='enabled'){
  const missing=['SHOPIFY_API_KEY','SHOPIFY_API_SECRET','TOKEN_ENCRYPTION_KEY','CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'].filter(k=>!source[k]?.trim());
  if(missing.length)throw new Error(`Missing environment: ${missing.join(', ')}`);
 }
 if(result.data.INTEGRATIONS_MODE==='enabled') {
  const required=['SHOPIFY_API_KEY','SHOPIFY_API_SECRET','META_APP_ID','META_APP_SECRET','META_API_VERSION','CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','TOKEN_ENCRYPTION_KEY'];
  const missing=required.filter(k=>!source[k]?.trim());
  if(missing.length) throw new Error(`Missing environment: ${missing.join(', ')}`);
 }
 if(result.data.INTEGRATIONS_MODE==='enabled'||result.data.SHOPIFY_INTEGRATION_MODE==='enabled'){
  if(result.data.AUTH_MODE!=='clerk')throw new Error('Invalid environment: AUTH_MODE must be clerk for Shopify');
  if(new URL(result.data.APP_URL).protocol!=='https:')throw new Error('Invalid environment: APP_URL must be HTTPS for Shopify');
  const key=Buffer.from(source.TOKEN_ENCRYPTION_KEY!,'base64');
  if(key.length!==32||key.toString('base64')!==source.TOKEN_ENCRYPTION_KEY)throw new Error('Invalid environment: TOKEN_ENCRYPTION_KEY');
  if(!/^[1-9][0-9]*$/.test(source.TOKEN_ENCRYPTION_KEY_VERSION??'')||!Number.isSafeInteger(Number(source.TOKEN_ENCRYPTION_KEY_VERSION)))throw new Error('Invalid environment: TOKEN_ENCRYPTION_KEY_VERSION');
 }
 return result.data;
}
