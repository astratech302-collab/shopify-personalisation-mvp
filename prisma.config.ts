import 'dotenv/config';
import {defineConfig} from 'prisma/config';
export default defineConfig({schema:'packages/database/schema.prisma',migrations:{path:'packages/database/migrations'},datasource:{url:process.env.DATABASE_URL ?? 'postgresql://mvp:mvp_local_only@localhost:55432/personalisation'}});
