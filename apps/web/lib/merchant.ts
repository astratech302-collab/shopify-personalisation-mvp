import 'server-only';
import {auth} from '@clerk/nextjs/server';
import pg from 'pg';
import {merchantHttp} from '../../../packages/integrations/src/merchant-http';
export async function merchantSession(){
 if(process.env.AUTH_MODE!=='clerk')return null;
 try{const session=await auth();return session.userId&&session.sessionId?{userId:session.userId,sessionId:session.sessionId}:null;}catch{return null;}
}
export async function withMerchant(work:(api:ReturnType<typeof merchantHttp>)=>Promise<Response>){
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
 try{return await work(merchantHttp(pool,merchantSession,process.env.APP_URL!));}finally{await pool.end();}
}
