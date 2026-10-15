import pg from 'pg';
import {PgBoss} from 'pg-boss';
import {enqueue,withTransaction} from '../packages/integrations/src/jobs';
// Only called by test-jobs with its randomly generated isolated schemas.
const schema=process.env.JOB_TEST_SCHEMA??'',queueSchema=process.env.JOB_TEST_QUEUE_SCHEMA??'';
if(!/^jobs_test_[a-f0-9]{32}$/.test(schema)||!/^boss_test_[a-f0-9]{32}$/.test(queueSchema))throw new Error('isolated_test_schema_required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});const boss=new PgBoss({connectionString:process.env.DATABASE_URL,schema:queueSchema});boss.on('error',()=>{});
try{await boss.start();const id=await withTransaction(pool,tx=>enqueue(tx,boss,{workspaceId:'w1',kind:'fixture.effect',idempotencyKey:'producer-process',payload:{objectId:'fixture'}}));console.log(id);}
finally{await boss.stop({graceful:true});await pool.end();}
