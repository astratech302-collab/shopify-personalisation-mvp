import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';
import {readEnv} from '../packages/integrations/src/env';
import {ingest} from '../packages/integrations/src/ingestion';
import {eventPost} from '../packages/integrations/src/event-http';
const url=readEnv(process.env).DATABASE_URL;const schema='ingest_test_'+randomUUID().replaceAll('-','');
const admin=new pg.Client({connectionString:url});await admin.connect();await admin.query(`CREATE SCHEMA "${schema}"`);
const pool=new pg.Pool({connectionString:url,options:`-c search_path=${schema} -c statement_timeout=5000`});
const now=new Date();const occurredAt=new Date(now.getTime()-120000).toISOString();let checks=0;
const event={schemaVersion:1,environment:'test',storeId:'pub1',eventId:'app1',occurredAt,kind:'app:experiment_assigned',visitorId:'visitor1',assignmentId:'a1',experimentId:'e1',revisionId:'r1',variantId:'original',entryAdId:'123'};
const envelope={schemaVersion:1,shopifyEventId:'wrapper1',clientId:'client1',event};
const batch=(...events:unknown[])=>({schemaVersion:1,events});
const standard={schemaVersion:1,environment:'test',storeId:'pub1',eventId:'checkout1',occurredAt,kind:'checkout_completed',clientId:'client1',checkoutId:null,orderId:null,observedSubtotal:null,currency:null};
const request=(body:unknown)=>new Request('https://app.example/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function invalid(input:unknown,code='invalid_request'){await assert.rejects(ingest(pool,input,now),error=>Boolean(error&&typeof error==='object'&&'code' in error&&error.code===code));checks++;}
try{
 for(const file of (await readdir('packages/database/migrations')).filter(f=>/^20/.test(f)).sort())await pool.query(await readFile(`packages/database/migrations/${file}/migration.sql`,'utf8'));
 await pool.query(`INSERT INTO "Workspace" ("id","name") VALUES ('w1','One'),('w2','Two');
 INSERT INTO "ShopInstallation" ("id","workspaceId","shopDomain","publicId","status") VALUES ('s1','w1','one.myshopify.com','pub1','installed'),('s2','w2','two.myshopify.com','pub2','installed');
 INSERT INTO "PageTarget" VALUES ('s1','page','product1','one.example','/products/item','en','block1');
 INSERT INTO "Experiment" ("storeId","id","workspaceId","pageTargetId","status","endedAt") VALUES ('s1','e1','w1','page','ended',CURRENT_TIMESTAMP-INTERVAL '1 minute');
 INSERT INTO "Revision" ("storeId","experimentId","id","snapshot","createdAt") VALUES ('s1','e1','r1','{}',CURRENT_TIMESTAMP-INTERVAL '3 minutes');
 INSERT INTO "Variant" VALUES ('s1','e1','r1','original','Original','Description',5000),('s1','e1','r1','A','Alternative','Description',5000);
 INSERT INTO "MetaConnection" ("workspaceId") VALUES ('w1');INSERT INTO "AdAccount" VALUES ('w1','account1','USD','UTC');
 INSERT INTO "Campaign" VALUES ('w1','account1','campaign','Campaign');INSERT INTO "AdSet" VALUES ('w1','account1','campaign','set');
 INSERT INTO "Ad" ("workspaceId","accountId","adSetId","id") VALUES ('w1','account1','set','123');INSERT INTO "AdMapping" VALUES ('w1','s1','e1','account1','123');
 INSERT INTO "Publication" ("storeId","id","experimentId","revisionId","generation","mode","status","createdAt") VALUES ('s1','p1','e1','r1',1,'experiment','inactive',CURRENT_TIMESTAMP-INTERVAL '3 minutes');`);
 const first=await ingest(pool,batch(envelope),now);assert.equal(first.accepted,1);checks++;
 const replay=await ingest(pool,batch({...envelope,shopifyEventId:'new-wrapper'}),now);assert.equal(replay.duplicates,1);checks++;
 const concurrent=await Promise.all([1,2,3].map(()=>ingest(pool,batch({...envelope,event:{...event,eventId:'concurrent'}}),now)));assert.equal(concurrent.reduce((sum,v)=>sum+v.accepted,0),1);checks++;
 const {visitorId:_visitor,...render}=event;void _visitor;
 await ingest(pool,batch({...envelope,event:{...render,eventId:'render-first',assignmentId:'not-received',kind:'app:variant_rendered',exposureId:'ex1'}}),now);checks++;
 // Relationship validation does not require currently-running state; first event was for an ended revision.
 assert.equal((await pool.query('SELECT "environment" FROM "Event" WHERE "providerEventId"=\'app1\'')).rows[0].environment,'test');checks++;
 await invalid(batch({...envelope,event:{...event,storeId:'pub2'}}));await invalid(batch({...envelope,event:{...event,variantId:'B'}}));await invalid(batch({...envelope,event:{...event,revisionId:'invented'}}));await invalid(batch({...envelope,event:{...event,entryAdId:'456'}}));
 await invalid(batch({...envelope,event:{...event,schemaVersion:2}}));await invalid(batch({...envelope,event:{...event,email:'private@example.com'}}));
 await invalid(batch({...envelope,event:{...event,occurredAt:new Date(now.getTime()+3600000).toISOString()}}));await invalid(batch({...envelope,event:{...event,occurredAt:new Date(now.getTime()-9*86400000).toISOString()}}));
 await invalid(batch({...envelope,event:{...event,variantId:'A'}}),'conflict');
 await invalid(batch(...Array.from({length:21},()=>standard)));await invalid(batch({...standard,observedSubtotal:12.5,currency:'USD'}));
 const accepted=await eventPost(request(batch(standard)),pool);assert.equal(accepted.status,202);assert.equal((await pool.query('SELECT * FROM "Event" WHERE "providerEventId"=\'checkout1\'')).rowCount,1);checks++;
 const oversized=await eventPost(new Request('https://app.example/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(65537)}),pool);assert.equal(oversized.status,413);checks++;
 const minute=new Date(Math.floor(now.getTime()/60000)*60000);await pool.query('UPDATE "IngestionWindow" SET "events"=599 WHERE "storeId"=\'s1\' AND "minute"=$1',[minute]);
 await invalid(batch({...envelope,event:{...event,eventId:'rollback1'}},{...envelope,event:{...event,eventId:'rollback2'}}),'rate_limited');assert.equal((await pool.query('SELECT * FROM "Event" WHERE "providerEventId" IN (\'rollback1\',\'rollback2\')')).rowCount,0);checks++;
 const limited=await Promise.allSettled(['limit1','limit2'].map(id=>ingest(pool,batch({...envelope,event:{...event,eventId:id}}),now)));assert.equal(limited.filter(r=>r.status==='fulfilled').length,1);assert.equal(limited.filter(r=>r.status==='rejected').length,1);checks++;
 const blocked=await eventPost(request(batch({...standard,eventId:'limited'})),pool);assert.equal(blocked.status,429);checks++;
 const unavailable=new pg.Pool({connectionString:'postgresql://mvp@127.0.0.1:1/unavailable',connectionTimeoutMillis:100});try{const response=await eventPost(request(batch(standard)),unavailable);assert.equal(response.status,503);assert.equal((await response.json()).error.retryable,true);checks++;}finally{await unavailable.end();}
 console.log(`ingestion_checks_passed=${checks}; durable_ack=pass; references=pass; ended_revision=pass; out_of_order=pass; concurrent_dedup=pass; rate_limit=pass; database_outage=pass`);
}finally{await pool.end();await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();}
