import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.PROOF_MODE!=='true'||process.env.NODE_ENV==='production')return new Response(null,{status:404});
 const script=await readFile(path.resolve(process.cwd(),'../../extensions/personalise/assets/personalise.js'),'utf8');
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gate A isolated fixture</title><body><p>LOCAL FIXTURE — not a Shopify theme or checkout proof</p><div data-lp-block data-proof="true" data-ad-id="123456789" data-store="fixture-store"><h1 data-lp-headline>Original headline</h1><p data-lp-description>Original description</p></div><p>Use ?lp_preview=original, A or B for an unmeasured preview. For consent fixtures use ?lp_consent=allowed&amp;lp_ad=123456789.</p><script>window.__proofEvents=[]; const allowed=new URL(location.href).searchParams.get('lp_consent')==='allowed';window.Shopify={designMode:false,customerPrivacy:{analyticsProcessingAllowed:()=>allowed,marketingAllowed:()=>allowed,preferencesProcessingAllowed:()=>allowed},analytics:{publish:(name,data)=>{window.__proofEvents.push({name,data});return true;}}};</script><script>${script}</script></body></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
