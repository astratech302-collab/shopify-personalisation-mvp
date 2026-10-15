import {createDatabase} from '../../../../../packages/database/src/client';
export const dynamic='force-dynamic';
export async function GET(){
 const db=createDatabase(process.env.DATABASE_URL!);
 try {await db.$queryRaw`SELECT 1`;const worker=await db.workerHeartbeat.findUnique({where:{id:'worker'}});return Response.json({status:'ok',database:'ok',worker:worker && Date.now()-worker.updatedAt.getTime()<30000?'ok':'stale'},{headers:{'Cache-Control':'no-store'}});}
 catch {return Response.json({status:'unavailable'},{status:503});}
 finally {await db.$disconnect();}
}
