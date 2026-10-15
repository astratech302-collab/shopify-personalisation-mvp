import 'server-only';
import pg from 'pg';
import {merchantSession} from './merchant';
import {shopifyHttp,shopifyError} from '../../../packages/integrations/src/shopify-http';
import {SecretVault} from '../../../packages/integrations/src/secrets';
import {DomainError} from '../../../packages/domain/src/errors';
import {readEnv} from '../../../packages/integrations/src/env';
export async function withShopify(work:(api:ReturnType<typeof shopifyHttp>)=>Promise<Response>){
 let pool:pg.Pool|undefined;
 try{
  const identity=await merchantSession();if(!identity)throw new DomainError('unauthorised');
  const env=readEnv(process.env);
  if(env.SHOPIFY_INTEGRATION_MODE!=='enabled'&&env.INTEGRATIONS_MODE!=='enabled')throw new DomainError('provider_rejected');
  const keyVersion=Number(process.env.TOKEN_ENCRYPTION_KEY_VERSION);
  const vault=new SecretVault({[keyVersion]:process.env.TOKEN_ENCRYPTION_KEY!},keyVersion);
  pool=new pg.Pool({connectionString:env.DATABASE_URL,max:2,connectionTimeoutMillis:3000,statement_timeout:15000});
  return await work(shopifyHttp(pool,async()=>identity,{apiKey:process.env.SHOPIFY_API_KEY!,apiSecret:process.env.SHOPIFY_API_SECRET!,appUrl:env.APP_URL,vault,keyVersion}));
 }catch(error){return shopifyError(error);}finally{await pool?.end();}
}
