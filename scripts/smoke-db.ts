import {createDatabase} from '../packages/database/src/client';
import {readEnv} from '../packages/integrations/src/env';
const db=createDatabase(readEnv(process.env).DATABASE_URL);
const id='smoke-event';
try{
 const create={id,storeId:'fixture-store',clientId:'fixture-client',kind:'smoke',occurredAt:new Date(),payload:{environment:'proof'}};
 await db.proofEvent.upsert({where:{id},create,update:{}});await db.proofEvent.upsert({where:{id},create,update:{}});
 if(await db.proofEvent.count({where:{id}})!==1)throw new Error('dedup_failed');
 console.log('database_write_dedup_read_pass');
}finally{await db.proofEvent.deleteMany({where:{id}});await db.$disconnect();}
