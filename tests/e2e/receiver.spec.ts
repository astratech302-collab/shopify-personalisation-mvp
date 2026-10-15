import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
test('proof receiver persists before acknowledgement and deduplicates republishing',async({request})=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL??'postgresql://mvp:mvp_local_only@localhost:55432/personalisation'});await db.connect();
 const id=randomUUID();const custom={schemaVersion:1,environment:'proof',eventId:id,assignmentId:id,experimentId:'gate-a-v1',revisionId:'proof-r1',variant:'original',entryAdId:'123456789'};
 const body={schemaVersion:1,environment:'proof',storeId:'fixture-store',eventId:randomUUID(),clientId:id,occurredAt:new Date().toISOString(),kind:'app:experiment_assigned',custom};
 try{
  expect((await request.post('/api/proof/events',{data:body})).status()).toBe(202);
  expect((await request.post('/api/proof/events',{data:{...body,eventId:randomUUID()}})).status()).toBe(202);
  const {rows}=await db.query('SELECT * FROM "ProofEvent" WHERE "clientId"=$1',[id]);expect(rows).toHaveLength(1);expect(rows[0].payload.custom.assignmentId).toBe(id);
  expect((await request.post('/api/proof/events',{data:{...body,storeId:'unknown'}})).status()).toBe(400);
  expect((await request.post('/api/proof/events',{data:{...body,email:'not-collected@example.com'}})).status()).toBe(400);
  expect((await request.post('/api/proof/events',{data:'x'.repeat(9000)})).status()).toBe(413);
 }finally{await db.query('DELETE FROM "ProofEvent" WHERE "clientId"=$1',[id]);await db.end();}
});
test('versioned event route rejects invalid payloads with safe permanent errors',async({request})=>{
 const response=await request.post('/api/events',{data:{schemaVersion:999,events:[]}});expect(response.status()).toBe(400);expect((await response.json()).error).toMatchObject({code:'invalid_request',retryable:false});
 const options=await request.fetch('/api/events',{method:'OPTIONS'});expect(options.status()).toBe(204);expect(options.headers()['access-control-allow-origin']).toBe('*');
 const oversized=await request.post('/api/events',{headers:{'Content-Type':'application/json'},data:'x'.repeat(65537)});expect(oversized.status()).toBe(413);
});

test('merchant APIs remain closed without configured verified sessions',async({request})=>{
 const headers={'x-user-id':'pretend-owner',Authorization:'Bearer pretend-session'};
 const list=await request.get('/api/workspaces',{headers});expect(list.status()).toBe(401);
 const foreign=await request.get('/api/workspaces/copied-workspace/experiments/copied-experiment',{headers});expect(foreign.status()).toBe(401);
 const create=await request.post('/api/workspaces',{headers:{...headers,Origin:'http://localhost:3000'},data:{name:'Pretend workspace',userId:'pretend-owner'}});expect(create.status()).toBe(401);
});
