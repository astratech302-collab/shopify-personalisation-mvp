# Shopify ad-to-page personalisation

A standalone merchant app MVP under implementation. **Gate A has not passed.** No live Shopify or Meta integration is claimed. Start with [implementation status](docs/implementation-status.md), [external setup](docs/external-setup.md), and the unchanged [planning contract](docs/planning/mvp-development-backlog.md).

## Local setup

Use Node 26.9.0 (the tested version in `.node-version`) and pnpm 11.25.0. Node 24 is permitted by dependencies but has not been tested here. Docker Compose provides PostgreSQL 17.6; the session also verified an isolated local PostgreSQL 14.22 cluster because Docker was stopped.

```sh
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build:extensions
pnpm dev
```

Open [local workspace](http://localhost:3000). `/api/health` verifies database reachability and reports whether the worker heartbeat is fresh. Both app processes load the root `.env` through the development launcher; required missing variables produce named errors. `INTEGRATIONS_MODE=disabled` explicitly permits local work without external accounts. Never commit `.env`. Enabling integrations currently validates prerequisites only; OAuth routes are not implemented yet.

The local `/proof` page is an isolated HTML fixture. `?lp_preview=original`, `A`, or `B` previews text without storage/events. `?lp_consent=allowed&lp_ad=123456789` enables **simulated consent and Shopify publisher** for browser tests. All resulting activity is `proof`, never production traffic. The public proof receiver is disabled in production and has no merchant-report API.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:constraints
pnpm test:jobs
pnpm test:ingestion
pnpm test:workspaces
pnpm build
pnpm test:lifecycle
pnpm exec playwright install chromium
pnpm test:e2e
```

`test:constraints` creates and drops a randomly named schema in the local database, applies all SQL migrations to an empty schema, and checks tenant/uniqueness/immutability constraints. Use only a development database. `test:lifecycle` starts the built worker and built web app on port 3101 and terminates both after checking health and shutdown. The database seed is repeatable and creates only a seed heartbeat.

For a host PostgreSQL fallback without Docker (macOS/Homebrew binaries already installed):

```sh
mkdir -p work
initdb -D work/postgres -U mvp --auth=trust -E UTF8 --locale=C
pg_ctl -D work/postgres -l work/postgres.log -o '-p 55432 -h 127.0.0.1 -k /tmp' start
createdb -h 127.0.0.1 -p 55432 -U mvp personalisation
# Run the migration/setup commands above.
# Stop this isolated cluster when finished:
pg_ctl -D work/postgres stop -m fast
```

This fallback binds loopback only and uses local trust authentication. It must never be used as a remote or production database.

## Repository map

- `apps/web`: Next.js workspace status, health, durable /api/events ingestion, development fixture and proof receiver.
- `apps/worker`: pg-boss lifecycle, transactional outbox processing, failure reconciliation and heartbeat; local audit and generation-aware Shopify lifecycle handlers are available.
- `packages/contracts`, `packages/domain`: browser-safe versioned contracts, lifecycle/error rules and proof helpers.
- `packages/database`: Prisma schema, SQL migrations and server persistence.
- `packages/integrations`: encryption, Shopify OAuth/refresh and lifecycle services, provider readers, durable jobs/receipts, ingestion and workspace services; live acceptance pending.
- `extensions/personalise`, `extensions/events`: officially generated proof extensions, uploaded in an unreleased development app version.
- `docs/evidence`: actual local verification and explicit pending platform matrix.

`build:extensions` bundles prototype source locally. It does **not** claim Shopify extension validation. Follow the official generator instructions in the external setup document before running a real platform build. Do not deploy the placeholder Shopify app config.

Current local contracts, server infrastructure and event ingestion are documented in `docs/contracts-and-domain.md`, `docs/infrastructure.md` and `docs/ingestion.md`. T05 Clerk/session routes and minimal account pages are wired; actual Clerk sign-in acceptance remains pending; see `docs/workspace-access.md`. All provider tests are fixtures.

## Shopify development without Meta

See [Shopify connection setup and verified limits](docs/shopify-connection.md). Keep `INTEGRATIONS_MODE=disabled`; the independent `SHOPIFY_INTEGRATION_MODE=enabled` switch requires real Clerk keys, a public HTTPS app origin and local encryption credentials. `pnpm test:shopify` and `pnpm test:shopify-webhooks` use fixture transports and isolated PostgreSQL/queue schemas, with no provider mutations.
