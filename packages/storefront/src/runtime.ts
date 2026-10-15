import {matchAd} from '../../../packages/domain/src/ad-id';
import {bucket,variantFor} from '../../../packages/domain/src/assignment';
import type {customProof} from '../../../packages/contracts/src/proof';
import type {z} from 'zod';
type Custom=z.infer<typeof customProof>;
type Privacy={analyticsProcessingAllowed():boolean;marketingAllowed():boolean;preferencesProcessingAllowed():boolean};
declare global {interface Window {Shopify?:{designMode?:boolean;customerPrivacy?:Privacy;analytics?:{publish(name:string,data:Custom):unknown}}}}
const copies={original:['Original headline','Original description'],A:['A headline','A supporting description'],B:['B headline','B supporting description']} as const;
function permitted(){try{const p=window.Shopify?.customerPrivacy;return p?.analyticsProcessingAllowed()===true&&p.marketingAllowed()===true&&p.preferencesProcessingAllowed()===true;}catch{return false;}}
function init(block:HTMLElement){
 if(block.dataset.initialised)return;block.dataset.initialised='true';
 const heading=block.querySelector<HTMLElement>('[data-lp-headline]');const description=block.querySelector<HTMLElement>('[data-lp-description]');
 if(!heading||!description)return;
 const original=[heading.textContent,description.textContent];
 const restore=()=>{heading.textContent=original[0];description.textContent=original[1];};
 // Development-only block toggle. Never enabled in a production release.
 if(block.dataset.proof!=='true')return;
 const params=new URL(location.href).searchParams;const preview=params.get('lp_preview');
 if(preview==='original'||preview==='A'||preview==='B'){heading.textContent=preview==='original'?original[0]:copies[preview][0];description.textContent=preview==='original'?original[1]:copies[preview][1];return;}
 if(window.Shopify?.designMode||!permitted())return;
 const ad=matchAd(new URL(location.href),[block.dataset.adId??'']);if(!ad.eligible)return;
 const storeId=block.dataset.store;if(!storeId)return;
 const key=`lp:proof:${storeId}:gate-a-v1`;
 let assignment:{visitorId:string;assignmentId:string;entryAdId:string;variant:'original'|'A'|'B';createdAt:number};
 try{
  const raw=localStorage.getItem(key);const existing=raw?JSON.parse(raw):null;
  if(existing && typeof existing.visitorId==='string'&&typeof existing.assignmentId==='string'&&typeof existing.entryAdId==='string'&&['original','A','B'].includes(existing.variant)&&Number.isFinite(existing.createdAt)&&Date.now()-existing.createdAt<30*86400000&&existing.createdAt<=Date.now())assignment=existing;
  else{const visitorId=crypto.randomUUID();assignment={visitorId,assignmentId:crypto.randomUUID(),entryAdId:ad.adId,variant:variantFor(bucket(visitorId,'gate-a-v1','proof-seed-v1'),3),createdAt:Date.now()};localStorage.setItem(key,JSON.stringify(assignment));}
 }catch{return;}
 const timers:ReturnType<typeof setTimeout>[]=[];
 let stopped=false;
 function publish(name:string,event:Custom){
  for(const delay of [0,250,1000])timers.push(setTimeout(()=>{if(!stopped&&permitted())try{window.Shopify?.analytics?.publish(name,event);}catch{/* Missing subscribers remain missing evidence. */}},delay));
 }
 const custom:Custom={schemaVersion:1,environment:'proof',eventId:assignment.assignmentId,assignmentId:assignment.assignmentId,experimentId:'gate-a-v1',revisionId:'proof-r1',variant:assignment.variant,entryAdId:assignment.entryAdId};
 publish('app:experiment_assigned',custom);
 if(assignment.variant!=='original'){heading.textContent=copies[assignment.variant][0];description.textContent=copies[assignment.variant][1];}
 const visible=block.isConnected&&block.getClientRects().length>0&&getComputedStyle(block).visibility!=='hidden'&&getComputedStyle(block).display!=='none';
 const exposureId=crypto.randomUUID();
 publish(visible?'app:variant_rendered':'app:variant_failed',{...custom,eventId:exposureId,exposureId});
 function consentChanged(){if(permitted())return;stopped=true;timers.forEach(clearTimeout);restore();try{localStorage.removeItem(key);}catch{/* storage can be denied */}}
 document.addEventListener('visitorConsentCollected',consentChanged);
 window.addEventListener('pagehide',()=>{stopped=true;timers.forEach(clearTimeout);document.removeEventListener('visitorConsentCollected',consentChanged);},{once:true});
}
for(const block of document.querySelectorAll<HTMLElement>('[data-lp-block]'))init(block);
