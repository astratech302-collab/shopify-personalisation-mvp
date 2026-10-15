import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {readEnv} from '../packages/integrations/src/env';
readEnv(process.env);
const port='3101';
const worker=spawn(process.execPath,['apps/worker/dist/index.js'],{env:{...process.env,NODE_ENV:'production',PROOF_MODE:'false'},stdio:['ignore','pipe','pipe']});
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{cwd:'apps/web',env:{...process.env,NODE_ENV:'production',PROOF_MODE:'false'},stdio:['ignore','pipe','pipe']});
let output='';worker.stdout.on('data',chunk=>{output+=chunk.toString();});worker.stderr.on('data',()=>{});web.stdout.on('data',()=>{});web.stderr.on('data',()=>{});
try{
 let healthy=false;
 for(let i=0;i<100;i++){
  if(worker.exitCode!==null||web.exitCode!==null)throw new Error(`process_failed worker=${worker.exitCode} web=${web.exitCode}`);
  try{const res=await fetch(`http://127.0.0.1:${port}/api/health`);const body=await res.json();if(res.ok&&body.worker==='ok'){healthy=true;break;}}catch{/* process booting */}
  await delay(100);
 }
 assert(healthy,'web_database_worker_health_failed');assert(output.includes('worker_ready'));
 const closed=once(worker,'exit');worker.kill('SIGTERM');
 const result=await Promise.race([closed,delay(10000).then(()=>{throw new Error('worker_shutdown_timeout');})]);
 assert.equal(result[0],0);assert(output.includes('worker_stopped'));
 console.log('production_web_health=pass; worker_heartbeat=pass; worker_graceful_shutdown=pass');
}finally{worker.kill('SIGTERM');web.kill('SIGTERM');}
