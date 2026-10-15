import {register} from '@shopify/web-pixels-extension';
import type {ProofEnvelope} from '../../../packages/contracts/src/proof';
import {isCustomProof,isProofEnvelope} from './proof-validation';
// Gate A proof extension. Activate only on an authorised development store.
register(({analytics,settings,init,customerPrivacy})=>{
 const storeId=typeof settings.storeId==='string'?settings.storeId:'';
 const endpoint=typeof settings.endpoint==='string'?settings.endpoint:'';
 let permitted=Boolean(init.customerPrivacy?.analyticsProcessingAllowed&&init.customerPrivacy?.marketingAllowed&&init.customerPrivacy?.preferencesProcessingAllowed);
 customerPrivacy.subscribe('visitorConsentCollected',({customerPrivacy:privacy})=>{permitted=privacy.analyticsProcessingAllowed&&privacy.marketingAllowed&&privacy.preferencesProcessingAllowed;});
 if(!storeId||!endpoint.startsWith('https://'))return;
 async function send(value:ProofEnvelope){
  if(!isProofEnvelope(value))return;
  for(let attempt=0;attempt<3;attempt++){
   if(!permitted)return;
   try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(3000)});if(response.ok||(response.status<500&&response.status!==429))return;}catch{/* bounded retry, no raw payload logging */}
   await new Promise(resolve=>setTimeout(resolve,250*2**attempt));
  }
 }
 for(const kind of ['app:experiment_assigned','app:variant_rendered','app:variant_failed'] as const){
  analytics.subscribe(kind,event=>{
   const custom=event.customData;if(!isCustomProof(custom))return;
   void send({schemaVersion:1,environment:'proof',storeId,eventId:event.id,clientId:event.clientId,occurredAt:event.timestamp,kind,custom});
  });
 }
 analytics.subscribe('checkout_completed',event=>{
  const checkout=event.data.checkout;
  void send({schemaVersion:1,environment:'proof',storeId,eventId:event.id,clientId:event.clientId,occurredAt:event.timestamp,kind:'checkout_completed',checkoutId:checkout.token??null,orderId:checkout.order?.id??null});
 });
});
