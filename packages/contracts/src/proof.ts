import {z} from 'zod';
export const variant=z.enum(['original','A','B']);
const id=z.string().min(1).max(128).regex(/^[a-zA-Z0-9_:./-]+$/);
export const customProof=z.object({schemaVersion:z.literal(1),environment:z.literal('proof'),eventId:id,assignmentId:id,experimentId:z.literal('gate-a-v1'),revisionId:z.literal('proof-r1'),variant,entryAdId:z.string().regex(/^[0-9]{1,32}$/),exposureId:id.optional()}).strict();
const base={schemaVersion:z.literal(1),environment:z.literal('proof'),storeId:id,eventId:id,clientId:id,occurredAt:z.iso.datetime()};
export const proofEnvelope=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.enum(['app:experiment_assigned','app:variant_rendered','app:variant_failed']),custom:customProof}).strict().superRefine((v,c)=>{if(v.kind==='app:variant_rendered'&&!v.custom.exposureId)c.addIssue({code:'custom',message:'exposureId required'});}),
 z.object({...base,kind:z.literal('checkout_completed'),checkoutId:id.nullable(),orderId:id.nullable()}).strict()
]);
export type ProofEnvelope=z.infer<typeof proofEnvelope>;
