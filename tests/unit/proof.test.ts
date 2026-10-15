import {describe,it,expect} from 'vitest';
import {matchAd} from '../../packages/domain/src/ad-id';
import {variantFor} from '../../packages/domain/src/assignment';
import {proofJoin} from '../../packages/domain/src/proof-join';
import {proofEnvelope} from '../../packages/contracts/src/proof';
import {readEnv} from '../../packages/integrations/src/env';
const match=(query:string)=>matchAd(new URL(`https://shop.example/products/item?${query}`),['123']);
describe('literal ad eligibility',()=>{
 it('accepts only a selected literal ID',()=>{expect(match('lp_ad=123')).toEqual({eligible:true,adId:'123'});});
 it.each([['','missing'],['fbclid=123','missing'],['lp_ad=','malformed'],['lp_ad=%7B%7Bad.id%7D%7D','malformed'],['lp_ad=123&lp_ad=123','duplicate'],['lp_ad=123&lp_ad=456','duplicate'],['lp_ad=456','unknown'],['lp_ad=+123','malformed']])('rejects %s', (query,reason)=>{expect(match(query)).toEqual({eligible:false,reason});});
});
it('uses exact equal-allocation boundaries',()=>{expect([0,3333,3334,6666,6667,9999].map(n=>variantFor(n,3))).toEqual(['original','original','A','A','B','B']);expect(variantFor(4999,2)).toBe('original');expect(variantFor(5000,2)).toBe('A');});
it('names missing env keys without disclosing values',()=>{expect(()=>readEnv({})).toThrow(/DATABASE_URL/);expect(()=>readEnv({DATABASE_URL:'postgresql://localhost/test',APP_URL:'http://localhost:3000',INTEGRATIONS_MODE:'enabled'})).toThrow(/SHOPIFY_API_KEY/);});
const assigned=proofEnvelope.parse({schemaVersion:1,environment:'proof',storeId:'store1',eventId:'wrapped1',clientId:'client1',occurredAt:'2026-10-15T00:00:00.000Z',kind:'app:experiment_assigned',custom:{schemaVersion:1,environment:'proof',eventId:'assignment1',assignmentId:'assignment1',experimentId:'gate-a-v1',revisionId:'proof-r1',variant:'A',entryAdId:'123'}});
const purchase=proofEnvelope.parse({schemaVersion:1,environment:'proof',storeId:'store1',eventId:'purchase1',clientId:'client1',occurredAt:'2026-10-16T00:00:00.000Z',kind:'checkout_completed',checkoutId:'checkout1',orderId:null});
it('joins assignment separately from render confirmation',()=>{expect(proofJoin(purchase,[assigned])).toMatchObject({state:'joined',rendered:false});});
it('never joins a different store or client',()=>{expect(proofJoin({...purchase,storeId:'other'},[assigned]).state).toBe('unmatched');expect(proofJoin({...purchase,clientId:'other'},[assigned]).state).toBe('unmatched');});
it('enforces seven days and rejects pre-assignment purchase',()=>{expect(proofJoin({...purchase,occurredAt:'2026-10-22T00:00:00.001Z'},[assigned]).state).toBe('unmatched');expect(proofJoin({...purchase,occurredAt:'2026-10-14T00:00:00.000Z'},[assigned]).state).toBe('unmatched');});
it('does not retain unexpected checkout contact data',()=>{expect(proofEnvelope.safeParse({...purchase,email:'private@example.com'}).success).toBe(false);});
