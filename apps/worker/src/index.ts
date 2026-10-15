import pg from 'pg';
import {JOB_QUEUE,JOB_OPTIONS,runQueuedJob,reconcileJobs} from '../../../packages/integrations/src/jobs';
import {shopifyLifecycleHandlers} from '../../../packages/integrations/src/shopify-webhooks';
import {foundationHandlers} from '../../../packages/integrations/src/foundation-handlers';
import {PgBoss} from 'pg-boss';
import {readEnv} from '../../../packages/integrations/src/env';
import {createDatabase} from '../../../packages/database/src/client';
const env=readEnv(process.env);
const db=createDatabase(env.DATABASE_URL);
const boss=new PgBoss(env.DATABASE_URL);
boss.on('error',()=>console.error('queue_error'));
await boss.start();
const pool=new pg.Pool({connectionString:env.DATABASE_URL});
await boss.createQueue(JOB_QUEUE,JOB_OPTIONS);
await boss.work<{outboxId:string}>(JOB_QUEUE,{pollingIntervalSeconds:1,batchSize:1,perJobResults:true},async jobs=>Promise.all(jobs.map(job=>runQueuedJob(pool,job,{...foundationHandlers,...shopifyLifecycleHandlers}))));
async function beat(){await reconcileJobs(pool,boss);await db.workerHeartbeat.upsert({where:{id:'worker'},create:{id:'worker',updatedAt:new Date()},update:{updatedAt:new Date()}});}
await beat();
console.log('worker_ready');
let pending=Promise.resolve();
const timer=setInterval(()=>{pending=pending.then(beat).catch(()=>{console.error('heartbeat_failed');});},10000);
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);await pending;await boss.stop({graceful:true});await pool.end();await db.$disconnect();console.log('worker_stopped');}
process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
