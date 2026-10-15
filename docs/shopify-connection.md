# Shopify connection and lifecycle development

Updated 15 October 2026. Meta credentials are not needed for these local implementations. This is not production acceptance.

## Implemented

- T09 local connection service: owner-only initiation from a verified Clerk session, same-origin POST, strict canonical shop hostname, ten-minute hashed one-use state tied to workspace/user/session/browser, official Shopify SDK callback HMAC and timestamp verification, callback replay rejection and ownership recheck before token exchange.
- Store ownership is checked both before redirect and under database locks before exchanging a code. Another workspace cannot claim a bound shop, including after uninstall. One workspace connects one shop; changing that shop is intentionally unsupported until an explicit transfer/disconnect design exists.
- Standalone authorization-code grant requests expiring offline tokens (`expiring=1`). Access and refresh tokens are encrypted with tenant/store/purpose-bound authenticated encryption. Granted scopes and both expiries are persisted. Concurrent refresh is serialized by a store row lock; callback replacement increments the installation generation. Failed callbacks consume their state and require a fresh connection attempt, preserving the existing installation record.
- Authenticated connection status returns only identity, health/scopes and expiry metadata. Tokens, browser verifier and encrypted envelopes are never returned. The account page has a minimal workspace/store connection form. Actual Clerk sign-in and consent screens have not been exercised.
- T10 partial lifecycle implementation: raw-body HMAC validation; a private generation/store/topic-bound callback key; 64 KiB/two-second bounded input; transactional receipt and outbox enqueue; replay dedup; immediate provider blocking on uninstall or missing scopes; inactive publications and paused running experiments; worker token cleanup and audits. Old-generation deliveries/jobs cannot damage a newer installation. Only minimised identity/topic metadata is persisted; full Shopify shop payloads and contact details are discarded.
- New migration `202610150008_shopify_oauth` adds the OAuth attempt table and encrypted refresh-token metadata. Eight migrations now apply to an empty schema; local development database migration was applied successfully.

## Configure Shopify independently

Keep `INTEGRATIONS_MODE=disabled` while Meta is unavailable. Set these in the ignored local `.env` only after the external prerequisites are ready:

```dotenv
SHOPIFY_INTEGRATION_MODE=enabled
AUTH_MODE=clerk
APP_URL=https://YOUR_DEVELOPMENT_HOST
```

`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `TOKEN_ENCRYPTION_KEY` (canonical base64 for 32 bytes) and `TOKEN_ENCRYPTION_KEY_VERSION=1` are required. A random encryption key was generated directly into the local `.env`; it was not printed or committed. Preserve the key when restarting. Environment wiring currently loads the active version only; wiring a multi-version keyring remains necessary before rotating an existing deployment's key.

The registered Shopify app must use this app's HTTPS origin and allow the exact callback `APP_URL/api/shopify/callback`. The local linked config still has the default Shopify app URL and no redirects; no live configuration was overwritten during this work. Set matching Clerk origins and use the actual sign-in flow, then open `/account`, create a workspace, reload, and connect the development store. The secret encryption key and app credentials never belong in URLs or client code.

## Lifecycle routes and remaining T10 work

POST `/api/shopify/webhooks/:storeId/:generation/:kind?key=...` accepts `uninstalled` and `scopes`. Server-only `lifecycleWebhookUrls` derives the private callback URLs for per-store subscriptions. Each generation needs its own registered callbacks; a static unsigned app-level URL is not equivalent. These subscriptions have NOT been registered remotely. Do not log or expose their callback keys. Receipt starts the queue only after authentication and payload validation. Failure to durably enqueue returns a non-success response so Shopify can retry.

Automatic subscription registration/reconciliation, live webhook delivery, compliance topics (`customers/data_request`, `customers/redact`, `shop/redact`), privacy export/redaction jobs and T34 completion remain pending. There is no public configuration cache yet (T15); current invalidation disables publication records immediately, and the future cache must honor installation state/generation. Future provider jobs must use the guarded token accessor. T10 is partial, not complete.

## Verification

- Typecheck and lint: pass.
- Unit tests: 64 pass, including official SDK HMAC/timestamp verification and transport/input bounds.
- New OAuth database/HTTP checks: 21 pass against isolated PostgreSQL schemas with fixture token responses. They cover workspace boundaries, browser/session binding, replay, membership revocation, encrypted storage, token expiry/refresh, concurrent refresh, reinstall and safe responses.
- New lifecycle checks: 13 pass against PostgreSQL and pg-boss, including invalid HMAC/key/topic, queue rollback, duplicate receipt, immediate disabling, minimisation, cleanup idempotency, stale generations and scope loss.
- Existing constraint/workspace/ingestion/jobs suites: 12/13/23/15 checks pass.
- Production build and web/worker startup, heartbeat and graceful shutdown: pass.
- Browser/API suite: 13 pass, including new unauthenticated Shopify endpoint checks.
- Earlier GitHub initial commit verification passed. New tests were added to CI; their remote result is separate from these local results.
- Owner previously confirmed real Dawn A/B preview text changes. Original-copy parity, cart behavior, activated pixel, real checkout join and delivered Meta ad remain unverified. Gate A has not passed.

## References checked for this implementation

- Shopify standalone flow: https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps
- Expiring offline tokens and refresh: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens
- Shopify webhook topics: https://shopify.dev/docs/api/webhooks/latest
- Installed Shopify SDK 15.0.1 callback validator and Next.js 16.4.1 route handler documentation were inspected directly.
