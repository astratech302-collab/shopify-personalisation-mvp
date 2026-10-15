# Actual local verification — 15 October 2026

Environment: macOS arm64, Node 26.9.0, pnpm 11.25.0; isolated PostgreSQL 14.22 on loopback port 55432. Docker daemon was stopped, so the Compose PostgreSQL 17.6 environment remains unrun. Chromium 156 supplied by Playwright 1.64.1. These are local/fixture results, not Shopify/Meta/platform acceptance.

| Check | Actual result |
|---|---|
| Dependency install | Passed with registry access and explicit Prisma/esbuild build-script permissions; exact lockfile saved |
| `pnpm peers check` | No peer dependency issues |
| `pnpm lint` | Passed ESLint and recursive browser/server import boundary scan; a temporary client → helper → integration import was rejected and removed |
| `pnpm typecheck` | Passed Prisma generation, shared/worker/extension TypeScript and Next TypeScript |
| `pnpm test` | 42 passed |
| `pnpm db:migrate` | Seven migrations applied successfully to the isolated local database |
| `pnpm db:seed` | Passed twice; repeatable seed heartbeat |
| `pnpm test:db` | Passed database write/read and deduplication smoke test |
| `pnpm test:constraints` | 12 passed, including all migrations into a fresh random schema and concurrent store-reservation attempts; temporary schema removed |
| `pnpm test:jobs` | 15 passed: transactional rollback, restart/producer-process exit, duplicate effect, bounded/manual retry, crash reconciliation, removed-queue recovery, durable webhook receipt and immediate permanent-error failure in the actual consumer |
| `pnpm test:ingestion` | 23 passed: public-ID resolution, forged references, ended/out-of-order events, concurrent dedup, batch/rate/body limits and database outage |
| `pnpm test:workspaces` | 13 passed using fixture identities/sessions: concurrent first workspace, two-user tenant isolation, owner permissions, expired/anonymous/forged requests, origin checks and HTTP payload authority |
| `pnpm build` | Next production app, bundled Node worker and both local extension prototypes built |
| `pnpm test:lifecycle` | Built web health, database reachability, persistent worker heartbeat and clean SIGTERM shutdown passed |
| `pnpm test:e2e` | 12 passed: JS-disabled original; original/A/B previews; unknown consent; stable assignment/separate signals; blocked storage; consent withdrawal; late consent; durable/deduplicated receiver and invalid/oversized payload rejection; actual /api/events rejection and closed merchant endpoints |
| Storefront prototype gzip | 1,466 bytes, budget 15,360 bytes; see `bundle-size.json` |
| Official Shopify generator | Blocked: CLI requires Shopify authorisation; no extension manifest/UID fabricated |
| Official Shopify app build | Not run; authenticated scaffolding prerequisite unavailable |
| Actual Dawn / delivered Meta ad / Shopify pixel / checkout | Not run; H01 accounts not ready |
| GitHub Actions / staging / Sentry / actual Clerk sign-in / CDN | Not run/configured live |

Early checks exposed an incompatible TypeScript/parser range, ESM launcher issues, an esbuild CLI wrapper issue and a Prisma compound one-to-one constraint requirement. Each was corrected; final commands above refer to the corrected implementation. Registry and localhost checks needed sandbox escalation; no automated approval review rejected the authorised operations. No production deployment occurred.

T07/T08/T17 local implementations and protected T05 wiring were added in the continuation session. No full platform/identity acceptance follows from fixture results. All temporary test schemas are dropped after checks.
