import {build} from 'esbuild';
await build({entryPoints:['apps/worker/src/index.ts'],bundle:true,platform:'node',packages:'external',format:'esm',outfile:'apps/worker/dist/index.js'});
