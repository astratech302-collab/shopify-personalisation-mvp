import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Pool} from 'pg';
import {DomainError} from '../../domain/src/errors';
import {withTransaction} from './jobs';
// This service has no HTTP identity resolver. Only a verified server-side Clerk
// session may supply userId when T05's route wiring is added. No dev auth bypass.
const workspaceName=z.string().trim().min(1).max(80);
export async function ensureFirstWorkspace(pool:Pool,userId:string,name:unknown){
 if(!userId)throw new DomainError('unauthorised');
 const parsed=workspaceName.safeParse(name);if(!parsed.success)throw new DomainError('invalid_request');
 const workspaceId='ws_'+createHash('sha256').update(JSON.stringify(['owner-workspace-v1',userId])).digest('hex');
 return withTransaction(pool,async tx=>{
  await tx.query('INSERT INTO "Workspace" ("id","name") VALUES ($1,$2) ON CONFLICT ("id") DO NOTHING',[workspaceId,parsed.data]);
  await tx.query('INSERT INTO "Membership" ("workspaceId","userId","role") VALUES ($1,$2,\'owner\') ON CONFLICT ("workspaceId","userId") DO NOTHING',[workspaceId,userId]);
  return (await tx.query<{id:string;name:string}>('SELECT "id","name" FROM "Workspace" WHERE "id"=$1',[workspaceId])).rows[0];
 });
}
export async function requireWorkspace(pool:Pool,userId:string,workspaceId:string){
 if(!userId)throw new DomainError('unauthorised');
 const {rows:[row]}=await pool.query<{id:string;name:string;role:string}>('SELECT w."id",w."name",m."role" FROM "Workspace" w JOIN "Membership" m ON m."workspaceId"=w."id" WHERE w."id"=$1 AND m."userId"=$2',[workspaceId,userId]);
 if(!row)throw new DomainError('not_found');return row;
}
export async function readExperiment(pool:Pool,userId:string,workspaceId:string,experimentId:string){
 if(!userId)throw new DomainError('unauthorised');
 const {rows:[row]}=await pool.query('SELECT e."id",e."status",e."version" FROM "Experiment" e JOIN "Membership" m ON m."workspaceId"=e."workspaceId" WHERE e."workspaceId"=$1 AND e."id"=$2 AND m."userId"=$3',[workspaceId,experimentId,userId]);
 if(!row)throw new DomainError('not_found');return row;
}
export function requireSameOrigin(origin:string|null,appUrl:string){
 try{if(!origin||new URL(origin).origin!==new URL(appUrl).origin)throw new Error();}catch{throw new DomainError('unauthorised');}
}
/** Member management uses fresh owner membership inside the same transaction. */
export async function addMember(pool:Pool,actorId:string,workspaceId:string,userId:string){
 if(!actorId)throw new DomainError('unauthorised');if(!userId)throw new DomainError('invalid_request');
 return withTransaction(pool,async tx=>{
  const {rows:[owner]}=await tx.query('SELECT "role" FROM "Membership" WHERE "workspaceId"=$1 AND "userId"=$2 FOR SHARE',[workspaceId,actorId]);
  if(owner?.role!=='owner')throw new DomainError('not_found');
  await tx.query('INSERT INTO "Membership" ("workspaceId","userId","role") VALUES ($1,$2,\'member\') ON CONFLICT DO NOTHING',[workspaceId,userId]);
  await tx.query('INSERT INTO "AuditRecord" ("id","workspaceId","actorId","action","objectId") VALUES ($1,$2,$3,$4,$5)',[randomUUID(),workspaceId,actorId,'membership.added',userId]);
 });
}
