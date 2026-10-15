import {z} from 'zod';
export const SCHEMA_VERSION=1 as const;
export const id=z.string().min(1).max(128).regex(/^[a-zA-Z0-9_:./-]+$/);
export const environment=z.enum(['production','proof','preview','test']);
export const variantId=z.enum(['original','A','B']);
export const timestamp=z.iso.datetime();
export const currency=z.string().regex(/^[A-Z]{3}$/);
// Decimal strings preserve the database's numeric(20,6) precision across JSON.
export const amount=z.string().regex(/^(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,6})?$/);
export const COPY_LIMITS={headline:120,description:400} as const;
function plainText(limit:number,required:boolean){return z.string().superRefine((value,ctx)=>{
 if([...value].length>limit)ctx.addIssue({code:'custom',message:`Maximum ${limit} Unicode code points`});
 if(required&&!value.trim())ctx.addIssue({code:'custom',message:'Text is required'});
 // Reject markup and control characters. Ordinary comparisons ("5 < 10") remain text.
 if(/<\/?[a-z!][^>]*>|&#?[a-z0-9]+;/i.test(value)||[...value].some(c=>{const n=c.codePointAt(0)!;return (n<32&&n!==9&&n!==10&&n!==13)||n===127;}))ctx.addIssue({code:'custom',message:'Use plain text without markup, entities or control characters'});
});}
export const copy=z.object({headline:plainText(COPY_LIMITS.headline,true),description:plainText(COPY_LIMITS.description,false)}).strict();
export const allocation=z.union([z.tuple([z.literal(5000),z.literal(5000)]),z.tuple([z.literal(3334),z.literal(3333),z.literal(3333)])]);
export const experimentStatus=z.enum(['draft','validating','ready','publishing','publish_failed','running','paused','ended']);
export const pageTarget=z.object({productId:id,host:z.hostname(),path:z.string().regex(/^\/products\/[^?#\s]+$/),locale:z.string().min(2).max(35),blockId:id}).strict();
export const variants=z.array(z.object({id:variantId,copy}).strict()).min(2).max(3).superRefine((value,ctx)=>{
 const expected=value.length===2?['original','A']:['original','A','B'];
 if(value.some((v,i)=>v.id!==expected[i]))ctx.addIssue({code:'custom',message:'Variants must be ordered original, A, then optional B'});
});
export const adIds=z.array(z.string().regex(/^[0-9]{1,32}$/)).min(1).max(100).refine(v=>new Set(v).size===v.length,'Ad IDs must be unique');
export const safeErrorCode=z.enum(['invalid_request','invalid_transition','conflict','not_found','unauthorised','provider_unavailable','provider_rejected','rate_limited','storage_unavailable','invalid_secret']);
export const safeError=z.object({schemaVersion:z.literal(1),error:z.object({code:safeErrorCode,message:z.string().max(160),retryable:z.boolean()}).strict()}).strict();
export type SafeErrorCode=z.infer<typeof safeErrorCode>;
