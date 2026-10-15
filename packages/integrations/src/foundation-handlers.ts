import {z} from 'zod';
import {id} from '../../contracts/src/common';
import {DomainError} from '../../domain/src/errors';
import type {JobHandler} from './jobs';
const payloadSchema=z.object({objectId:id}).strict();
/** Local operational audit handler; no provider mutations. Future handlers need their own allowlist. */
export const foundationHandlers:Readonly<Record<string,JobHandler>>={
 'foundation.audit':async(tx,payload,identity)=>{
  const parsed=payloadSchema.safeParse(payload);if(!parsed.success)throw new DomainError('invalid_request');
  await tx.query('INSERT INTO "AuditRecord" ("id","workspaceId","actorId","action","objectId") VALUES ($1,$2,$3,$4,$5)',[identity.idempotencyKey+':'+identity.workspaceId,identity.workspaceId,'worker','foundation.audit',parsed.data.objectId]);
 }
};
