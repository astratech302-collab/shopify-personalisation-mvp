import {createDatabase} from './src/client';
import {readEnv} from '../integrations/src/env';
const db=createDatabase(readEnv(process.env).DATABASE_URL);
try { await db.workerHeartbeat.upsert({where:{id:'seed'},create:{id:'seed',updatedAt:new Date()},update:{}}); console.log('Development seed ready'); } finally {await db.$disconnect();}
