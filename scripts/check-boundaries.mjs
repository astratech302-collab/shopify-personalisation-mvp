import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const skipped=new Set(['node_modules','.next','dist','generated','assets']);
const roots=['packages/contracts','packages/domain','packages/storefront','extensions'];
const files=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skipped.has(e.name))continue;const p=path.resolve(dir,e.name);if(e.isDirectory())walk(p);else if(/\.[cm]?[jt]sx?$/.test(p))files.push(p);}}
for(const root of [...roots,'apps/web'])walk(root);
const browserFiles=new Set(files.filter(file=>roots.some(root=>file.startsWith(path.resolve(root)+path.sep))));
const parsed=new Map();
for(const file of files){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);parsed.set(file,source);if(source.statements.some(s=>ts.isExpressionStatement(s)&&ts.isStringLiteral(s.expression)&&s.expression.text==='use client'))browserFiles.add(file);}
const visited=new Set();const failures=new Set();
function scan(file){
 if(visited.has(file))return;visited.add(file);
 const source=parsed.get(file)??ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 function check(specifier){
  if(/^(?:node:|pg$|pg-boss$|server-only$|@prisma\/|@shopify\/shopify-api|@mvp\/(?:database|integrations))/.test(specifier)){failures.add(`${file}: ${specifier}`);return;}
  if(!specifier.startsWith('.'))return;
  const target=path.resolve(path.dirname(file),specifier);
  if(['packages/database','packages/integrations'].some(root=>target.startsWith(path.resolve(root)+path.sep))){failures.add(`${file}: ${specifier}`);return;}
  const resolved=[target,...['.ts','.tsx','.js','.mjs','/index.ts','/index.tsx'].map(s=>target+s)].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(resolved)scan(resolved);
 }
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))check(node.moduleSpecifier.text);
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))){const spec=node.arguments[0];if(spec&&ts.isStringLiteral(spec))check(spec.text);else failures.add(`${file}: computed browser import requires review`);}
  ts.forEachChild(node,visit);
 }
 visit(source);
}
for(const file of browserFiles)scan(file);
if(failures.size){console.error('Forbidden browser dependencies:\n'+[...failures].join('\n'));process.exit(1);}
