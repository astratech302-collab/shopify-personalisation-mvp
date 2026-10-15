# T08 server infrastructure

## Credential envelopes

`SecretVault` encrypts tokens with AES-256-GCM, a random 96-bit nonce, authentication tag, envelope version and key version. Authenticated associated data binds the token to an explicit workspace/provider context; use a stable value such as `workspace-id:shopify:installation-generation`. A token encrypted for one context fails to decrypt under another. Keep 32-byte base64 keys in environment/secret management, supply the current and previous key versions to the vault during rotation, re-encrypt records with the active key, and remove old keys only after migration. No key/token is emitted by errors or loggers.

`INTEGRATIONS_MODE=enabled` now validates canonical 32-byte base64 `TOKEN_ENCRYPTION_KEY` and a positive `TOKEN_ENCRYPTION_KEY_VERSION`. Local disabled mode needs neither. Actual installation/token persistence is still T09/T20; these helpers do not create a provider connection. Fixture keys exist only in tests.

## Provider reads

The Shopify reader uses the installed official `@shopify/shopify-api` 15.0.1 GraphQL client, pinned `ApiVersion.October26`, disabled SDK logging, no nested SDK retries, and the verified `request(..., {signal})` option. Fixture transport tests exercise the actual SDK's abort and GraphQL error path. Its current interface permits query operations only. OAuth/pixel mutations belong to later explicit integration services.

The server-side Meta adapter accepts a configured API version and token, fixed Graph host and bounded read-only paths/parameters. Credentials use an Authorization header; arbitrary pagination URLs and redirects are rejected. It classifies HTTP throttles/server failures, strips raw error bodies, and applies a finite request deadline. Version `v99.0` in tests is deliberately fictitious and never queried. The legacy body-code throttle candidates 4/17/32/613 are covered by simulated responses only; actual version/endpoint-specific access, error codes, permissions and pagination remain T20/T21 live checks. No Meta API version has been selected for a real account.

Timeouts are 5 seconds by default, configurable from 1 ms to 30 seconds. Neither adapter automatically retries; durable jobs own bounded retry. No provider call runs during storefront loading.

## Durable jobs and local effects

Call `enqueue(tx, boss, input)` inside the same PostgreSQL transaction as the state change. Outbox identity is unique by workspace and idempotency key. The existing key must refer to the same kind and JSON payload; conflicting reuse fails. The pg-boss send uses the transaction's SQL adapter, so state/outbox/queue commit together. Queue payloads contain only an outbox reference. Producer handlers must minimise payloads to references and allowlisted fields; never put raw secrets, webhook bodies or checkout/customer records into outbox payloads.

`processOutbox` locks the outbox row, performs a registered local database effect, and marks completion in one transaction. Redelivery after effect commit and before queue acknowledgement skips the completed effect. This provides idempotent **local database effects**, not a guarantee of exactly-once remote API side effects. A future handler that calls an external service must use that provider's supported idempotency/reconciliation mechanism and installation-generation fencing before being enabled.

Initial queue policy: permanent rejections terminate immediately through pg-boss per-job settlement; transient failures receive at most four attempts, one-second starting retry delay, exponential backoff with pg-boss jitter capped at 30 seconds, 60-second active expiration, and seven-day completed-job retention. Attempts remain cumulative across manual retries. The worker reconciles exhausted/crashed or missing queue records into inspectable failure states without retaining raw queue error output. Manual retry grants another bounded queue attempt; a removed queue record can be recreated for the same unfinished outbox reference. Completion records still suppress duplicate local effects.

The only enabled worker handler is `foundation.audit`: a strict object-ID payload produces a local operational audit record. No real ad, catalog, publication or provider job is enabled. Future handlers require their own schema, tenant/generation checks and tests.

Local operator commands (database access is privileged; these are not merchant endpoints):

```sh
pnpm jobs list WORKSPACE_ID
pnpm jobs retry WORKSPACE_ID OUTBOX_ID
pnpm test:jobs
```

The operator CLI refuses production mode. Merchant HTTP actions still need T05 verified sessions/membership. Cross-workspace retry is rejected by the service; job inspection omits payloads, tokens and raw provider errors.

## Webhook durability boundary

`receiveWebhook` expects an already authenticated, minimised delivery from a future T10 receiver. It verifies workspace/store/installation-generation relationships, derives the deduplication key from store/generation/provider delivery identity, and commits receipt/outbox/queue before returning accepted. A conflicting duplicate payload/topic fails. HMAC verification, public webhook routes, uninstall/privacy handlers and generation-aware domain effects are not implemented by this helper.

## Verification and references

`test:jobs` uses isolated fresh domain/queue schemas and tests rollback, concurrent duplicate enqueue, conflicting idempotency reuse, queue-client restart, a producer OS process exiting before delivery, duplicate effect execution, bounded failure, failed manual retry, tenant-scoped operator retry, crashed-attempt reconciliation, removed-queue recovery, durable webhook receipt deduplication and immediate permanent-error termination in an actual queue consumer. Test schemas are dropped after the checks.

Verified against installed SDK/queue declarations and implementations, plus [Shopify GraphQL client reference](https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/docs/reference/clients/Graphql.md), [SDK abort-signal change](https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/CHANGELOG.md), and [pg-boss jobs/transaction/retry documentation](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md). Meta's [official SDK](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/api.js) confirms the Graph request surface; authenticated app access and detailed error/review rules remain unverified.
