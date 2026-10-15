export type AdMatch={eligible:true;adId:string}|{eligible:false;reason:'missing'|'malformed'|'duplicate'|'unknown'};
/** lp_ad is a literal decimal Meta ad ID. fbclid is never an identity fallback. */
export function matchAd(url:URL, selected:readonly string[]):AdMatch {
 const values=url.searchParams.getAll('lp_ad');
 if(values.length===0)return {eligible:false,reason:'missing'};
 if(values.length!==1)return {eligible:false,reason:'duplicate'};
 const id=values[0];
 if(!/^[0-9]{1,32}$/.test(id))return {eligible:false,reason:'malformed'};
 if(!selected.includes(id))return {eligible:false,reason:'unknown'};
 return {eligible:true,adId:id};
}
