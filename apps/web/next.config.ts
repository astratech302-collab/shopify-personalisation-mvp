import path from 'node:path';
import type {NextConfig} from 'next';
const config:NextConfig={allowedDevOrigins:process.env.APP_URL?[new URL(process.env.APP_URL).hostname]:[],turbopack:{root:path.resolve(import.meta.dirname,'../..')},outputFileTracingRoot:path.resolve(import.meta.dirname,'../..')};
export default config;
