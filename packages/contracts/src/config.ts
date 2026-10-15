import {z} from 'zod';
import {id,pageTarget,adIds,variants,allocation,timestamp,variantId,copy} from './common';
const base={schemaVersion:z.literal(1),storeId:id,generatedAt:timestamp,expiresAt:timestamp};
const active=z.object({...base,mode:z.literal('experiment'),experimentId:id,revisionId:id,page:pageTarget,adIds,variants,allocation,seed:z.string().min(1).max(128),hashVersion:z.literal('fnv1a-json-v1'),observationWindowDays:z.literal(7),consentPolicy:z.literal('analytics-marketing-preferences-v1')}).strict().superRefine((v,c)=>{if(v.variants.length!==v.allocation.length)c.addIssue({code:'custom',message:'Allocation must match variant count'});});
export const publicConfig=z.discriminatedUnion('mode',[
 z.object({...base,mode:z.literal('inactive')}).strict(),active,
 z.object({...base,mode:z.literal('published'),publicationId:id,page:pageTarget,adIds,variantId,copy}).strict()
]).superRefine((v,c)=>{if(Date.parse(v.expiresAt)<=Date.parse(v.generatedAt)||Date.parse(v.expiresAt)-Date.parse(v.generatedAt)>30000)c.addIssue({code:'custom',message:'Configuration freshness must be positive and at most 30 seconds'});});
export type PublicConfig=z.infer<typeof publicConfig>;
