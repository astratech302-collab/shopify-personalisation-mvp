# Implementation handoff — 15 October 2026

The implementation repository now has completed local implementations of T07, T08 and T17, plus the locally testable T05 authentication/access wiring. The all-40-ticket register in `docs/implementation-status.md` retains every upstream qualification and external blocker.

## Work implemented

- **T07:** strict versioned public configuration, custom/standard event, draft, ingestion and report schemas; shared Unicode/plain-text copy limits; exact equal allocations; explicit lifecycle transitions; safe typed errors.
- **T08:** authenticated credential encryption with key/context binding; timeout/error-safe Shopify and Meta read adapters; transactional outbox/pg-boss jobs; idempotent local effects; bounded transient retry, permanent failure handling, safe inspection/operator retry, crash/retention reconciliation and durable webhook receipts. Provider tests use fixtures, including the actual installed Shopify SDK with a fixture transport.
- **T17:** `/api/events` commits before acknowledgement; validates public-store/revision/variant/ad references; handles out-of-order and ended-revision observations; deduplicates logical events; bounds bodies/batches/rates; returns safe permanent or retryable errors. It does not activate a live pixel or attribute purchases.
- **T05, partial:** Clerk proxy/session guard, minimal sign-in/sign-up/account UI and protected workspace APIs; idempotent owner workspace creation; current membership checks, tenant-scoped reads and origin protection. `AUTH_MODE=clerk` can be enabled separately from Shopify/Meta. Real Clerk sign-in/sign-out/session-expiry acceptance remains unverified.

The database now has seven migrations and 27 models. CI configuration includes the added checks but has not run on GitHub. Planning documents and synced references remain unchanged.

## Verification

Local passing results: 42 unit tests; 12 database constraint checks; 15 durable-job checks; 23 ingestion checks; 13 workspace/session-fixture checks; 12 browser/API tests. Lint, type checking, production web/worker/prototype builds, database migrations, web health, worker heartbeat and graceful shutdown pass. Storefront prototype size remains 1,466 bytes gzipped.

These local checks do not prove platform behaviour. The durability tests cover local database effects; remote exactly-once side effects are not guaranteed. Public browser events can be forged and are not treated as cryptographically authenticated purchases.

## Remaining blockers and next actions

**Gate A remains blocked.** T01 official extension scaffolding/platform build and T02–T04 actual Dawn/ad/pixel/checkout evidence await the development Shopify and Meta accounts. No actual ad click or exposure-to-checkout identity continuity has been verified. T05 also needs a Clerk development registration/keys for actual identity-provider acceptance; its local and fixture paths are implemented.

Next account-dependent actions: complete real Clerk sign-in/sign-out/expiry checks; finish authenticated Shopify extension scaffolding; execute the Gate A matrix. T09/T20 provider connection work retains those prerequisites. Keep production editor/reporting and publication behind their gates. No ad spend, campaign mutation, catalog edit or production deployment occurred.

Implementation details and exact commands are in `README.md`, `docs/contracts-and-domain.md`, `docs/infrastructure.md`, `docs/ingestion.md`, `docs/workspace-access.md` and `docs/external-setup.md`.
