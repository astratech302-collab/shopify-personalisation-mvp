import type {ProofEnvelope} from '../../contracts/src/proof';
import {OBSERVATION_WINDOW_MS} from './index';
/** A diagnostic only. Received events do not attest actual Shopify delivery. */
export function proofJoin(purchase:ProofEnvelope,events:ProofEnvelope[]){
 if(purchase.kind!=='checkout_completed')return {state:'unmatched',reason:'not_purchase'} as const;
 const assignments=events.filter(e=>e.kind==='app:experiment_assigned'&&e.storeId===purchase.storeId&&e.clientId===purchase.clientId&&Date.parse(e.occurredAt)<=Date.parse(purchase.occurredAt)&&Date.parse(purchase.occurredAt)-Date.parse(e.occurredAt)<=OBSERVATION_WINDOW_MS);
 if(assignments.length!==1)return {state:'unmatched',reason:assignments.length?'ambiguous_assignment':'no_assignment'} as const;
 const assignment=assignments[0];
 if(assignment.kind==='checkout_completed')throw new Error('invalid_assignment');
 const exposure=events.find(e=>e.kind==='app:variant_rendered'&&e.storeId===purchase.storeId&&e.clientId===purchase.clientId&&e.custom.assignmentId===assignment.custom.assignmentId&&e.custom.variant===assignment.custom.variant&&e.custom.revisionId===assignment.custom.revisionId&&Date.parse(e.occurredAt)>=Date.parse(assignment.occurredAt)&&Date.parse(e.occurredAt)<=Date.parse(purchase.occurredAt));
 return {state:'joined',assignmentId:assignment.custom.assignmentId,rendered:Boolean(exposure)} as const;
}
