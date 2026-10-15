import pg from 'pg';
import {PgBoss} from 'pg-boss';
import {lifecycleWebhook} from '../../../../../../../../../packages/integrations/src/shopify-webhooks';
import {JOB_QUEUE,JOB_OPTIONS} from '../../../../../../../../../packages/integrations/src/jobs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{storeId:string;generation:string;kind:string}>}){
 const {storeId,generation,kind}=await params;
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:2000,statement_timeout:3000});
 const boss=new PgBoss({connectionString:process.env.DATABASE_URL!,schedule:false,supervise:false});boss.on('error',()=>{});
 try{
  if(!process.env.SHOPIFY_API_SECRET)return new Response(null,{status:503});
  return await lifecycleWebhook(request,{pool,boss,secret:process.env.SHOPIFY_API_SECRET,storeId,generation:Number(generation),kind,prepareQueue:async()=>{await boss.start();await boss.createQueue(JOB_QUEUE,JOB_OPTIONS);}});
 }catch{return new Response(null,{status:503});}finally{await boss.stop({graceful:true}).catch(()=>{});await pool.end();}
}
