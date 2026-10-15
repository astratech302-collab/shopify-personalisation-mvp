import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {PgBoss} from 'pg-boss';
import {DomainError} from '../packages/domain/src/errors';
import {readEnv} from '../packages/integrations/src/env';
import {JOB_QUEUE,JOB_OPTIONS,enqueue,withTransaction,processOutbox,retryFailed,inspectJobs,receiveWebhook,reconcileJobs,runQueuedJob} from '../packages/integrations/src/jobs';
const url=readEnv(process.env).DATABASE_URL;
const suffix=randomUUID().replaceAll('-','');const schema='jobs_test_'+suffix;const queueSchema='boss_test_'+suffix;
const admin=new pg.Client({connectionString:url});await admin.connect();await admin.query(`CREATE SCHEMA "${schema}"`);
const pool=new pg.Pool({connectionString:url,options:`-c search_path=${schema} -c statement_timeout=5000`});
const makeBoss=()=>{const value=new PgBoss({connectionString:url,schema:queueSchema});value.on('error',()=>{});return value;};
let boss=makeBoss();let checks=0;
const jobInput={workspaceId:'w1',kind:'fixture.effect',idempotencyKey:'once',payload:{objectId:'fixture'}};
const handler=async(tx:pg.PoolClient)=>{await tx.query('UPDATE "Counter" SET n=n+1');};
async function take(){for(let i=0;i<400;i++){const jobs=await boss.fetch<{outboxId:string}>(JOB_QUEUE);if(jobs.length)return jobs[0];await delay(100);}throw new Error('job_fetch_timeout');}
try{
 const migrations=(await readdir('packages/database/migrations')).filter(f=>/^20/.test(f)).sort();
 for(const file of migrations)await pool.query(await readFile(`packages/database/migrations/${file}/migration.sql`,'utf8'));
 await pool.query(`INSERT INTO "Workspace" ("id","name") VALUES ('w1','Fixture'),('w2','Other'); CREATE TABLE "Counter" (n INTEGER NOT NULL);INSERT INTO "Counter" VALUES (0); INSERT INTO "ShopInstallation" ("id","workspaceId","shopDomain","publicId") VALUES ('s1','w1','fixture.myshopify.com','pub1');`);
 await boss.start();await boss.createQueue(JOB_QUEUE,JOB_OPTIONS);
 await assert.rejects(withTransaction(pool,async tx=>{await tx.query('UPDATE "Counter" SET n=99');await enqueue(tx,boss,{...jobInput,idempotencyKey:'rollback'});throw new Error('rollback');}));
 assert.equal((await pool.query('SELECT * FROM "Counter"')).rows[0].n,0);assert.equal((await pool.query('SELECT * FROM "Outbox"')).rowCount,0);assert.equal((await boss.fetch(JOB_QUEUE)).length,0);checks++;
 const ids=await Promise.all([1,2].map(()=>withTransaction(pool,tx=>enqueue(tx,boss,jobInput))));assert.equal(ids[0],ids[1]);checks++;
 await assert.rejects(withTransaction(pool,tx=>enqueue(tx,boss,{...jobInput,payload:{changed:true}})));checks++;
 await boss.stop({graceful:true});boss=makeBoss();await boss.start();
 const job=await take();assert.equal(job.data.outboxId,ids[0]);checks++;
 await processOutbox(pool,job.data.outboxId,{'fixture.effect':handler});
 // Simulate a crash after local effect commit but before queue acknowledgement.
 await processOutbox(pool,job.data.outboxId,{'fixture.effect':handler});
 assert.equal((await pool.query('SELECT * FROM "Counter"')).rows[0].n,1);await boss.complete(JOB_QUEUE,job);checks++;
 const failedId=await withTransaction(pool,tx=>enqueue(tx,boss,{...jobInput,idempotencyKey:'failure'}));
 for(let attempt=0;attempt<4;attempt++){
  const failed=await take();assert.equal(failed.id,failedId);
  await assert.rejects(processOutbox(pool,failedId,{'fixture.effect':async()=>{throw new Error('private-token checkout payload');}}));
  await boss.fail(JOB_QUEUE,failed,{code:'storage_unavailable'});
 }
 const [terminal]=await boss.findJobs(JOB_QUEUE,{id:failedId});assert.equal(terminal.state,'failed');
 const failedRows=await inspectJobs(pool,'w1');assert.equal(failedRows.find(row=>row.id===failedId).status,'failed');assert(!JSON.stringify(failedRows).includes('private-token'));checks++;
 await assert.rejects(retryFailed(pool,boss,'w2',failedId));checks++;
 await retryFailed(pool,boss,'w1',failedId);const failedAgain=await take();await assert.rejects(processOutbox(pool,failedAgain.data.outboxId,{'fixture.effect':async()=>{throw new Error('sensitive');}}));await boss.fail(JOB_QUEUE,failedAgain,{code:'storage_unavailable'});assert.equal((await inspectJobs(pool,'w1')).find(row=>row.id===failedId).status,'failed');checks++;
 await retryFailed(pool,boss,'w1',failedId);const retried=await take();await processOutbox(pool,retried.data.outboxId,{'fixture.effect':handler});await boss.complete(JOB_QUEUE,retried);assert.equal((await pool.query('SELECT * FROM "Counter"')).rows[0].n,2);checks++;
 const webhook={workspaceId:'w1',storeId:'s1',generation:1,providerEventId:'delivery1',topic:'fixture',kind:'fixture.effect',payload:{objectId:'fixture'}};
 const receipt=await receiveWebhook(pool,boss,webhook);const duplicate=await receiveWebhook(pool,boss,webhook);assert.equal(receipt.outboxId,duplicate.outboxId);assert.equal((await pool.query('SELECT * FROM "WebhookReceipt"')).rowCount,1);checks++;
 await assert.rejects(receiveWebhook(pool,boss,{...webhook,workspaceId:'w2'}));await assert.rejects(receiveWebhook(pool,boss,{...webhook,topic:'different'}));checks++;
 // Drain the durable webhook, then prove a job survives its producer OS process exiting.
 const webhookJob=await take();await processOutbox(pool,webhookJob.data.outboxId,{'fixture.effect':handler});await boss.complete(JOB_QUEUE,webhookJob);
 const child=await promisify(execFile)(process.execPath,['--import','tsx','scripts/job-producer-fixture.ts'],{env:{...process.env,JOB_TEST_SCHEMA:schema,JOB_TEST_QUEUE_SCHEMA:queueSchema}});
 const fromProcess=await take();assert.equal(fromProcess.id,child.stdout.trim());await processOutbox(pool,fromProcess.data.outboxId,{'fixture.effect':handler});await boss.complete(JOB_QUEUE,fromProcess);checks++;
 // A worker can fail/exhaust attempts before it ever records an outbox attempt.
 const crashedId=await withTransaction(pool,tx=>enqueue(tx,boss,{...jobInput,idempotencyKey:'crash-before-handler'}));
 for(let attempt=0;attempt<4;attempt++){const claimed=await take();assert.equal(claimed.id,crashedId);await boss.fail(JOB_QUEUE,claimed,{code:'storage_unavailable'});}
 await reconcileJobs(pool,boss);assert.equal((await inspectJobs(pool,'w1')).find(row=>row.id===crashedId).status,'failed');checks++;
 const expiredId=await withTransaction(pool,tx=>enqueue(tx,boss,{...jobInput,idempotencyKey:'queue-retention-fixture'}));await boss.deleteJob(JOB_QUEUE,expiredId);await reconcileJobs(pool,boss);await retryFailed(pool,boss,'w1',expiredId);const restored=await take();assert.equal(restored.id,expiredId);await processOutbox(pool,restored.data.outboxId,{'fixture.effect':handler});await boss.complete(JOB_QUEUE,restored);checks++;
 const permanentId=await withTransaction(pool,tx=>enqueue(tx,boss,{...jobInput,idempotencyKey:'permanent',kind:'fixture.permanent'}));
 await boss.work<{outboxId:string}>(JOB_QUEUE,{perJobResults:true,pollingIntervalSeconds:0.5,batchSize:1},async jobs=>Promise.all(jobs.map(job=>runQueuedJob(pool,job,{'fixture.permanent':async()=>{throw new DomainError('provider_rejected',false);}}))));
 for(let i=0;i<100;i++){const [state]=await boss.findJobs(JOB_QUEUE,{id:permanentId});if(state.state==='failed')break;await delay(100);}
 const [permanent]=await boss.findJobs(JOB_QUEUE,{id:permanentId});assert.equal(permanent.state,'failed');assert.equal((await inspectJobs(pool,'w1')).find(row=>row.id===permanentId).attempts,1);await boss.offWork(JOB_QUEUE);checks++;
 console.log(`durable_job_checks_passed=${checks}; rollback=pass; restart=pass; duplicate_effect=pass; bounded_retry=pass; terminal_retry=pass; durable_webhook_receipt=pass`);
}finally{await boss.stop({graceful:true});await pool.end();await admin.query(`DROP SCHEMA IF EXISTS "${queueSchema}" CASCADE`);await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();}
