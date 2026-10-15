import {z} from 'zod';
import {id,pageTarget,adIds,variants,allocation} from './common';
export const draftRequest=z.object({schemaVersion:z.literal(1),experimentId:id,expectedVersion:z.number().int().nonnegative(),page:pageTarget,adIds,variants,allocation}).strict().superRefine((v,c)=>{if(v.variants.length!==v.allocation.length)c.addIssue({code:'custom',message:'Allocation must match variant count'});});
// Workspace/store scope is derived from verified membership, never supplied here.
export type DraftRequest=z.infer<typeof draftRequest>;
