import pg from 'pg';
import {eventOptions,eventPost} from '../../../../../packages/integrations/src/event-http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const OPTIONS=eventOptions;
export async function POST(request:Request){
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
 try{return await eventPost(request,pool);}finally{await pool.end();}
}
