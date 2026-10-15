import type {ProofEnvelope,customProof} from '../../../packages/contracts/src/proof';
import type {z} from 'zod';
type Custom=z.infer<typeof customProof>;
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>=1&&v.length<=128&&/^[a-zA-Z0-9_:./-]+$/.test(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
// Small browser guard; the receiver remains authoritative through the shared Zod contract.
export function isCustomProof(v:unknown):v is Custom {
 return record(v)&&keys(v,['schemaVersion','environment','eventId','assignmentId','experimentId','revisionId','variant','entryAdId','exposureId'])&&v.schemaVersion===1&&v.environment==='proof'&&id(v.eventId)&&id(v.assignmentId)&&v.experimentId==='gate-a-v1'&&v.revisionId==='proof-r1'&&['original','A','B'].includes(v.variant as string)&&typeof v.entryAdId==='string'&&/^[0-9]{1,32}$/.test(v.entryAdId)&&(v.exposureId===undefined||id(v.exposureId));
}
export function isProofEnvelope(v:unknown):v is ProofEnvelope {
 if(!record(v)||v.schemaVersion!==1||v.environment!=='proof'||!id(v.storeId)||!id(v.eventId)||!id(v.clientId)||typeof v.occurredAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v.occurredAt)||!Number.isFinite(Date.parse(v.occurredAt)))return false;
 const base=['schemaVersion','environment','storeId','eventId','clientId','occurredAt','kind'];
 if(v.kind==='checkout_completed')return keys(v,[...base,'checkoutId','orderId'])&&(v.checkoutId===null||id(v.checkoutId))&&(v.orderId===null||id(v.orderId));
 return ['app:experiment_assigned','app:variant_rendered','app:variant_failed'].includes(v.kind as string)&&keys(v,[...base,'custom'])&&isCustomProof(v.custom)&&(v.kind!=='app:variant_rendered'||Boolean(v.custom.exposureId));
}
