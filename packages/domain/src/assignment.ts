/** v1: FNV-1a over UTF-8 JSON tuple; uint32 modulo 10000. Freeze before live use. */
export function bucket(visitor:string,experiment:string,seed:string):number {
 let hash=2166136261;
 for(const byte of new TextEncoder().encode(JSON.stringify([visitor,experiment,seed]))){hash^=byte;hash=Math.imul(hash,16777619);}
 return (hash>>>0)%10000;
}
export function variantFor(bucket:number,count:2|3):'original'|'A'|'B'{
 if(!Number.isInteger(bucket)||bucket<0||bucket>=10000)throw new Error('invalid_bucket');
 if(count===2)return bucket<5000?'original':'A';
 return bucket<3334?'original':bucket<6667?'A':'B';
}
