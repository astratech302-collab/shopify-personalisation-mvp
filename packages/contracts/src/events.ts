import {z} from 'zod';
import {id,environment,timestamp,variantId,amount,currency} from './common';
const base={schemaVersion:z.literal(1),environment,storeId:id,eventId:id,occurredAt:timestamp};
const assignment={assignmentId:id,experimentId:id,revisionId:id,variantId,entryAdId:z.string().regex(/^[0-9]{1,32}$/)};
export const customEvent=z.discriminatedUnion('kind',[
 z.object({...base,...assignment,kind:z.literal('app:experiment_assigned'),visitorId:id}).strict(),
 z.object({...base,...assignment,kind:z.literal('app:variant_rendered'),exposureId:id}).strict(),
 z.object({...base,...assignment,kind:z.literal('app:variant_failed'),reason:z.enum(['missing_block','hidden_block','detached_block','copy_mismatch','storage_unavailable'])}).strict()
]);
export const standardEvent=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.enum(['product_added_to_cart','checkout_started']),clientId:id}).strict(),
 z.object({...base,kind:z.literal('checkout_completed'),clientId:id,checkoutId:id.nullable(),orderId:id.nullable(),observedSubtotal:amount.nullable(),currency:currency.nullable()}).strict().superRefine((v,c)=>{if((v.observedSubtotal===null)!==(v.currency===null))c.addIssue({code:'custom',message:'Amount and currency must be supplied together'});})
]);
// Platform field extraction belongs to T18/T28; this is the allowlisted internal envelope.
export const pixelCustomEnvelope=z.object({schemaVersion:z.literal(1),shopifyEventId:id,clientId:id,event:customEvent}).strict();
export type CustomEvent=z.infer<typeof customEvent>;
export type StandardEvent=z.infer<typeof standardEvent>;

export const ingestionBatch=z.object({schemaVersion:z.literal(1),events:z.array(z.union([pixelCustomEnvelope,standardEvent])).min(1).max(20)}).strict();
export type IngestionBatch=z.infer<typeof ingestionBatch>;
