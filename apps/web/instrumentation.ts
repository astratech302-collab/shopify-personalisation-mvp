export async function register(){if(process.env.NEXT_RUNTIME==='nodejs'){const {readEnv}=await import('../../packages/integrations/src/env');readEnv(process.env);}}
