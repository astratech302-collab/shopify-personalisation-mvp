import {it,expect,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {validWebhookHmac,webhookRouteKey,lifecycleWebhook} from '../../packages/integrations/src/shopify-webhooks';
import type {Pool} from 'pg';
import type {PgBoss} from 'pg-boss';
it('validates the exact raw bytes and rejects modified/invalid signatures',()=>{
 const body=Buffer.from('{"id":1}');const signature=createHmac('sha256','secret').update(body).digest('base64');
 expect(validWebhookHmac(body,signature,'secret')).toBe(true);expect(validWebhookHmac(Buffer.from('{ "id":1}'),signature,'secret')).toBe(false);expect(validWebhookHmac(body,signature,'other')).toBe(false);expect(validWebhookHmac(body,null,'secret')).toBe(false);expect(validWebhookHmac(body,'invalid','secret')).toBe(false);
});
it('binds private callback routes to installation generation, store and topic',()=>{
 const key=webhookRouteKey('secret','s1',1,'app/uninstalled');expect(key).not.toBe(webhookRouteKey('secret','s1',2,'app/uninstalled'));expect(key).not.toBe(webhookRouteKey('secret','s2',1,'app/uninstalled'));expect(key).not.toBe(webhookRouteKey('secret','s1',1,'app/scopes_update'));
});
it('rejects invalid callback keys before starting queue or touching database',async()=>{
 const prepareQueue=vi.fn();const pool={connect:vi.fn()} as unknown as Pool;
 const response=await lifecycleWebhook(new Request('https://app.example/webhook?key=invalid',{method:'POST',body:'{}'}),{pool,boss:{} as PgBoss,secret:'secret',storeId:'s1',generation:1,kind:'uninstalled',prepareQueue});expect(response.status).toBe(401);expect(prepareQueue).not.toHaveBeenCalled();expect(pool.connect).not.toHaveBeenCalled();
});
