import {spawn} from 'node:child_process';
import {readEnv} from '../packages/integrations/src/env';
readEnv(process.env);
const children=[
 spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1'],{cwd:'apps/web',stdio:'inherit',env:process.env}),
 spawn(process.execPath,['--import','tsx','apps/worker/src/index.ts'],{stdio:'inherit',env:process.env})
];
let stopping=false;
function stop(){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
for(const child of children)child.once('exit',code=>{if(!stopping){process.exitCode=code??1;stop();}});
