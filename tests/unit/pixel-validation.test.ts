import {describe,it,expect} from 'vitest';
import {customProof,proofEnvelope} from '../../packages/contracts/src/proof';
import {isCustomProof,isProofEnvelope} from '../../extensions/events/src/proof-validation';
const custom={schemaVersion:1,environment:'proof',eventId:'e1',assignmentId:'a1',experimentId:'gate-a-v1',revisionId:'proof-r1',variant:'A',entryAdId:'123'};
const base={schemaVersion:1,environment:'proof',storeId:'s1',eventId:'e1',clientId:'c1',occurredAt:'2026-10-15T12:00:00.000Z'};
describe('small pixel validation against authoritative receiver contracts',()=>{
 it('validates custom events and rejects malformed or unexpected fields',()=>{
  const cases=[custom,{...custom,exposureId:'x1'},null,[],{...custom,extra:true},{...custom,variant:'C'},{...custom,entryAdId:'fbclid'},{...custom,assignmentId:''},{...custom,eventId:'x'.repeat(129)},{...custom,exposureId:null},{...custom,schemaVersion:2}];
  for(const value of cases)expect(isCustomProof(value)).toBe(customProof.safeParse(value).success);
 });
 it('requires render exposure and valid envelope identity and checkout fields',()=>{
  const assigned={...base,kind:'app:experiment_assigned',custom};
  const rendered={...base,kind:'app:variant_rendered',custom:{...custom,exposureId:'x1'}};
  const checkout={...base,kind:'checkout_completed',checkoutId:null,orderId:'gid://shopify/Order/1'};
  const cases=[assigned,rendered,checkout,{...assigned,kind:'app:variant_failed'},{...rendered,custom},{...assigned,extra:1},{...assigned,clientId:''},{...assigned,occurredAt:'invalid'},{...checkout,orderId:undefined},{...checkout,checkoutId:42},{...assigned,kind:'page_viewed'}];
  for(const value of cases)expect(isProofEnvelope(value)).toBe(proofEnvelope.safeParse(value).success);
 });
});
