import pg from 'pg';
import {PgBoss} from 'pg-boss';
import {readEnv} from '../packages/integrations/src/env';
import {inspectJobs,retryFailed} from '../packages/integrations/src/jobs';
import {toSafeError} from '../packages/domain/src/errors';
const env=readEnv(process.env);
if(env.NODE_ENV==='production')throw new Error('This local operator command is not enabled for production');
const [action,workspaceId,outboxId]=process.argv.slice(2);
if(!['list','retry'].includes(action)||!workspaceId||(action==='retry'&&!outboxId))throw new Error('Usage: jobs list WORKSPACE_ID | jobs retry WORKSPACE_ID OUTBOX_ID');
const pool=new pg.Pool({connectionString:env.DATABASE_URL});const boss=new PgBoss(env.DATABASE_URL);boss.on('error',()=>{});
try{await boss.start();if(action==='retry')await retryFailed(pool,boss,workspaceId,outboxId);console.log(JSON.stringify(await inspectJobs(pool,workspaceId),null,2));}
catch(error){console.error(JSON.stringify(toSafeError(error)));process.exitCode=1;}
finally{await boss.stop({graceful:true});await pool.end();}
