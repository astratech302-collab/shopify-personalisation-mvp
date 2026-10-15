import {createHash} from 'node:crypto';
import {createDatabase} from '../packages/database/src/client';
import {readEnv} from '../packages/integrations/src/env';
import {proofEnvelope} from '../packages/contracts/src/proof';
import {proofJoin} from '../packages/domain/src/proof-join';
const env=readEnv(process.env);
if(env.PROOF_MODE!=='true'||env.NODE_ENV==='production')throw new Error('proof_mode_required');
const clientId=process.argv[2];if(!clientId)throw new Error('Provide the observed Shopify pixel client ID as the first argument');
const db=createDatabase(env.DATABASE_URL);
try{
 const rows=await db.proofEvent.findMany({where:{storeId:process.env.PROOF_STORE_ID??'fixture-store',clientId},orderBy:{occurredAt:'asc'}});
 const events=rows.map(row=>proofEnvelope.parse(row.payload));
 const purchases=events.filter(e=>e.kind==='checkout_completed');
 console.log(JSON.stringify({environment:'proof',platformVerified:false,clientHash:createHash('sha256').update(clientId).digest('hex').slice(0,16),receivedEvents:events.map(e=>({kind:e.kind,occurredAt:e.occurredAt})),checkoutDiagnostics:purchases.map(p=>proofJoin(p,events)),note:'This diagnostic cannot attest actual ad delivery or Shopify event provenance. Attach the real test path and version evidence separately.'},null,2));
}finally{await db.$disconnect();}
