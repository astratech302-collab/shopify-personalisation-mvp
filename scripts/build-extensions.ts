import {build} from 'esbuild';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
mkdirSync('extensions/personalise/assets',{recursive:true});
await build({entryPoints:['packages/storefront/src/runtime.ts'],bundle:true,minify:true,target:'es2020',outfile:'extensions/personalise/assets/personalise.js'});
const bytes=gzipSync(readFileSync('extensions/personalise/assets/personalise.js')).length;
if(bytes>15*1024)throw new Error(`Storefront gzip budget exceeded: ${bytes}`);
writeFileSync('docs/evidence/bundle-size.json',JSON.stringify({storefrontGzipBytes:bytes,budgetBytes:15360,note:'Local esbuild output; Shopify platform build is checked separately.'},null,2)+'\n');
console.log(`storefront_gzip_bytes=${bytes}`);
