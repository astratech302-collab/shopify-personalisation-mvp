import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {ingestionBatch} from '../../contracts/src/events';
import {DomainError} from '../../domain/src/errors';
import {withTransaction} from './jobs';
export const INGESTION_LIMITS={bodyBytes:65536,batchEvents:20,eventsPerStoreMinute:600,futureSkewMs:300000,maxDeliveryAgeMs:8*86400000} as const;
/** Accepts only internal normalised envelopes. Browser event provenance remains untrusted. */
export async function ingest(pool:Pool,input:unknown,now=new Date()){
 const parsed=ingestionBatch.safeParse(input);if(!parsed.success)throw new DomainError('invalid_request');
 return withTransaction(pool,async tx=>{
  let accepted=0,duplicates=0;
  for(const item of parsed.data.events){
   const custom='event' in item;const event=custom?item.event:item;
   const clientId=item.clientId;const source=custom?'custom':'shopify';
   const occurredAt=Date.parse(event.occurredAt);
   if(occurredAt>now.getTime()+INGESTION_LIMITS.futureSkewMs||occurredAt<now.getTime()-INGESTION_LIMITS.maxDeliveryAgeMs)throw new DomainError('invalid_request');
   // storeId on the wire is PUBLIC installation identity, never a workspace selector.
   const {rows:[store]}=await tx.query<{id:string}>(`SELECT "id" FROM "ShopInstallation" WHERE "publicId"=$1 AND "status" IN ('installed','uninstalled')`,[event.storeId]);
   if(!store)throw new DomainError('invalid_request');
   if(custom){
    const c=item.event;
    const {rows:[reference]}=await tx.query<{endedAt:Date|null}>(`SELECT e."endedAt" FROM "Variant" v JOIN "Experiment" e ON e."storeId"=v."storeId" AND e."id"=v."experimentId" JOIN "AdMapping" a ON a."storeId"=e."storeId" AND a."experimentId"=e."id" WHERE v."storeId"=$1 AND v."experimentId"=$2 AND v."revisionId"=$3 AND v."id"=$4 AND a."adId"=$5 AND EXISTS (SELECT 1 FROM "Publication" p WHERE p."storeId"=v."storeId" AND p."experimentId"=v."experimentId" AND p."revisionId"=v."revisionId" AND p."mode"='experiment' AND p."status" IN ('active','inactive') AND p."createdAt"<=$6)`,[store.id,c.experimentId,c.revisionId,c.variantId,c.entryAdId,new Date(occurredAt)]);
    if(!reference||(reference.endedAt&&occurredAt>reference.endedAt.getTime()))throw new DomainError('invalid_request');
   }
   const minute=new Date(Math.floor(now.getTime()/60000)*60000);
   const counter=await tx.query<{events:number}>(`INSERT INTO "IngestionWindow" ("storeId","minute","events") VALUES ($1,$2,1) ON CONFLICT ("storeId","minute") DO UPDATE SET "events"="IngestionWindow"."events"+1 RETURNING "events"`,[store.id,minute]);
   if(counter.rows[0].events>INGESTION_LIMITS.eventsPerStoreMinute)throw new DomainError('rate_limited',true);
   // Ignore only Shopify's wrapper ID for custom retries; preserve the app's logical identity.
   const payload=custom?{schemaVersion:1,clientId,event:item.event}:item;
   const result=await tx.query(`INSERT INTO "Event" ("storeId","id","source","providerEventId","clientId","kind","occurredAt","payload","environment") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT ("storeId","source","providerEventId") DO NOTHING RETURNING "id"`,[store.id,randomUUID(),source,event.eventId,clientId,event.kind,new Date(occurredAt),payload,event.environment]);
   if(result.rowCount){accepted++;continue;}
   const prior=await tx.query<{same:boolean}>(`SELECT "payload"=$4::jsonb AS same FROM "Event" WHERE "storeId"=$1 AND "source"=$2 AND "providerEventId"=$3`,[store.id,source,event.eventId,JSON.stringify(payload)]);
   if(!prior.rows[0]?.same)throw new DomainError('conflict');duplicates++;
  }
  return {schemaVersion:1 as const,accepted,duplicates};
 });
}
