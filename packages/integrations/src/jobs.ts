import {randomUUID,createHash} from 'node:crypto';
import type {PgBoss} from 'pg-boss';
import type {Pool,PoolClient} from 'pg';
import {DomainError} from '../../domain/src/errors';
export const JOB_QUEUE='domain-work-v1';
export const JOB_OPTIONS={retryLimit:3,retryDelay:1,retryBackoff:true,retryDelayMax:30,expireInSeconds:60,deleteAfterSeconds:7*86400} as const;
export type Sql={query:PoolClient['query']};
export type JobInput={workspaceId:string;kind:string;idempotencyKey:string;payload:Record<string,unknown>};
export type JobHandler=(tx:PoolClient,payload:Record<string,unknown>,identity:{workspaceId:string;idempotencyKey:string})=>Promise<void>;
/** Call only inside the transaction that changes domain state. Queue and outbox commit together. */
export async function enqueue(tx:PoolClient,boss:PgBoss,input:JobInput):Promise<string>{
 if(!/^[a-z][a-z0-9_.-]{0,63}$/.test(input.kind)||!input.workspaceId||!input.idempotencyKey||input.idempotencyKey.length>256)throw new DomainError('invalid_request');
 const proposed=randomUUID();
 const result=await tx.query<{id:string;kind:string;payload:Record<string,unknown>}>(`INSERT INTO "Outbox" ("id","workspaceId","kind","idempotencyKey","payload") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("workspaceId","idempotencyKey") DO UPDATE SET "idempotencyKey"=EXCLUDED."idempotencyKey" RETURNING "id","kind","payload"`,[proposed,input.workspaceId,input.kind,input.idempotencyKey,input.payload]);
 const row=result.rows[0];
 const equal=await tx.query<{same:boolean}>('SELECT $1::jsonb=$2::jsonb AS same',[row.payload,input.payload]);
 if(row.kind!==input.kind||!equal.rows[0].same)throw new DomainError('conflict');
 if(row.id===proposed){const queued=await boss.send(JOB_QUEUE,{outboxId:row.id},{...JOB_OPTIONS,id:row.id,db:{executeSql:(sql,values)=>tx.query(sql,values)}});if(!queued)throw new DomainError('conflict');}
 return row.id;
}
export async function withTransaction<T>(pool:Pool,work:(tx:PoolClient)=>Promise<T>):Promise<T>{
 const tx=await pool.connect();try{await tx.query('BEGIN');const result=await work(tx);await tx.query('COMMIT');return result;}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
}
export async function processOutbox(pool:Pool,outboxId:string,handlers:Readonly<Record<string,JobHandler>>){
 try{
  await withTransaction(pool,async tx=>{
   const {rows:[row]}=await tx.query<{workspaceId:string;kind:string;payload:Record<string,unknown>;idempotencyKey:string;status:string}>('SELECT * FROM "Outbox" WHERE "id"=$1 FOR UPDATE',[outboxId]);
   if(!row)throw new DomainError('not_found');if(row.status==='completed')return;if(row.status==='failed')throw new DomainError('conflict');
   const handler=Object.hasOwn(handlers,row.kind)?handlers[row.kind]:undefined;if(!handler)throw new DomainError('invalid_request');
   await handler(tx,row.payload,{workspaceId:row.workspaceId,idempotencyKey:row.idempotencyKey});
   await tx.query(`UPDATE "Outbox" SET "status"='completed',"attempts"="attempts"+1,"lastErrorCode"=NULL WHERE "id"=$1`,[outboxId]);
  });
 }catch(error){
  const code=error instanceof DomainError?error.code:'storage_unavailable';
  const retryable=error instanceof DomainError?error.retryable:true;
  await pool.query(`UPDATE "Outbox" SET "attempts"="attempts"+1,"lastErrorCode"=$2,"status"=CASE WHEN NOT $3::boolean OR "attempts"+1>=4 THEN 'failed' ELSE 'pending' END WHERE "id"=$1 AND "status"='pending'`,[outboxId,code,retryable]).catch(()=>{throw new DomainError('storage_unavailable',true);});
  throw new DomainError(code,retryable);
 }
}
/** Input workspace must come from verified membership or an authorised operator, never request-body scope. */
export async function inspectJobs(pool:Pool,workspaceId:string){return (await pool.query('SELECT "id","kind","status","attempts","lastErrorCode","createdAt" FROM "Outbox" WHERE "workspaceId"=$1 ORDER BY "createdAt" DESC LIMIT 100',[workspaceId])).rows;}
export async function retryFailed(pool:Pool,boss:PgBoss,workspaceId:string,outboxId:string){
 return withTransaction(pool,async tx=>{
  const {rows:[row]}=await tx.query(`SELECT "id" FROM "Outbox" WHERE "id"=$1 AND "workspaceId"=$2 AND "status"='failed' FOR UPDATE`,[outboxId,workspaceId]);
  if(!row)throw new DomainError('not_found');
  const [job]=await boss.findJobs(JOB_QUEUE,{id:outboxId,db:{executeSql:(sql,values)=>tx.query(sql,values)}});
  if(job&&job.state!=='failed')throw new DomainError('conflict');
  const adapter={executeSql:(sql:string,values?:unknown[])=>tx.query(sql,values)};
  if(job)await boss.retry(JOB_QUEUE,outboxId,{db:adapter});
  else if(!await boss.send(JOB_QUEUE,{outboxId},{...JOB_OPTIONS,id:outboxId,db:adapter}))throw new DomainError('conflict');
  await tx.query(`UPDATE "Outbox" SET "status"='pending',"lastErrorCode"=NULL WHERE "id"=$1`,[outboxId]);
 });
}
/** Authenticated/allowlisted callers supply only minimised payload. HMAC verification is T10. */
export async function receiveWebhook(pool:Pool,boss:PgBoss,input:Omit<JobInput,'idempotencyKey'>&{storeId:string;generation:number;providerEventId:string;topic:string}){
 return withTransaction(pool,async tx=>{
  const store=await tx.query('SELECT "id" FROM "ShopInstallation" WHERE "id"=$1 AND "workspaceId"=$2 AND "generation"=$3 FOR SHARE',[input.storeId,input.workspaceId,input.generation]);
  if(store.rowCount!==1)throw new DomainError('not_found');
  const idempotencyKey='webhook:'+createHash('sha256').update(JSON.stringify([input.storeId,input.generation,input.providerEventId])).digest('hex');
  const outboxId=await enqueue(tx,boss,{...input,idempotencyKey});
  const prior=await tx.query('SELECT "topic","outboxId" FROM "WebhookReceipt" WHERE "storeId"=$1 AND "installationGeneration"=$2 AND "providerEventId"=$3',[input.storeId,input.generation,input.providerEventId]);
  if(prior.rowCount&&(prior.rows[0].topic!==input.topic||prior.rows[0].outboxId!==outboxId))throw new DomainError('conflict');
  await tx.query('INSERT INTO "WebhookReceipt" ("storeId","installationGeneration","providerEventId","topic","outboxId") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[input.storeId,input.generation,input.providerEventId,input.topic,outboxId]);
  return {accepted:true as const,outboxId};
 });
}

/** Reconcile exhausted/crashed attempts from pg-boss without copying its raw error output. */
export async function reconcileJobs(pool:Pool,boss:PgBoss){
 const pending=await pool.query<{id:string}>('SELECT "id" FROM "Outbox" WHERE "status"=\'pending\' ORDER BY "createdAt" LIMIT 100');
 for(const row of pending.rows)await withTransaction(pool,async tx=>{
  const current=await tx.query('SELECT "id" FROM "Outbox" WHERE "id"=$1 AND "status"=\'pending\' FOR UPDATE',[row.id]);
  if(!current.rowCount)return;
  const [job]=await boss.findJobs(JOB_QUEUE,{id:row.id,db:{executeSql:(sql,values)=>tx.query(sql,values)}});
  if(!job||job.state==='failed'||job.state==='cancelled')await tx.query('UPDATE "Outbox" SET "status"=\'failed\',"lastErrorCode"=\'storage_unavailable\' WHERE "id"=$1',[row.id]);
 });
}

/** pg-boss per-job settlement avoids retrying permanent domain/provider rejections. */
export async function runQueuedJob(pool:Pool,job:{id:string;data:{outboxId:string}},handlers:Readonly<Record<string,JobHandler>>){
 try{await processOutbox(pool,job.data.outboxId,handlers);return {id:job.id,status:'completed' as const};}
 catch(error){const safe=error instanceof DomainError?error:new DomainError('storage_unavailable',true);return {id:job.id,status:safe.retryable?'failed' as const:'deadletter' as const,output:{code:safe.code}};}
}
