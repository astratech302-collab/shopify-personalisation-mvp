import js from '@eslint/js';
import ts from 'typescript-eslint';
export default [
 {ignores:['.shopify/**','**/node_modules/**','**/.next/**','**/dist/**','**/generated/**','work/**','extensions/**/assets/**','**/next-env.d.ts']},
 js.configs.recommended,...ts.configs.recommended,
 {languageOptions:{globals:{process:'readonly',console:'readonly',URL:'readonly',URLSearchParams:'readonly',setInterval:'readonly',clearInterval:'readonly',setTimeout:'readonly',fetch:'readonly',window:'readonly',document:'readonly',Buffer:'readonly',TextEncoder:'readonly'}},rules:{'@typescript-eslint/no-explicit-any':'error'}}
];