# Dependency choices

Registry metadata checked 15 October 2026; exact direct versions in package manifests and all transitive resolutions in `pnpm-lock.yaml`. Install with `--frozen-lockfile`. pnpm peer validation reports no issues.

| Component | Pinned version |
|---|---|
| Node (tested) / pnpm | 26.9.0 / 11.25.0 |
| Next.js / React | 16.4.1 / 19.3.1 |
| TypeScript | 5.9.3 |
| Prisma client/CLI/PG adapter | 7.10.0 |
| pg / pg-boss | 8.23.1 / 12.38.0 |
| Shopify CLI / API library / Pixel SDK | 4.9.4 / 15.0.1 / 2.18.0 |
| Clerk / Sentry Next.js | 7.9.15 / 11.7.0 |
| Tailwind / PostCSS plugin | 4.3.3 / 4.3.3 |
| Vitest / Playwright | 5.0.4 / 1.64.1 |
| ESLint / typescript-eslint | 10.12.0 / 8.57.0 |
| Zod / esbuild | 4.6.7 / 0.28.2 |
| PostgreSQL Compose / tested fallback | 17.6-alpine / 14.22 |

Prisma's `latest` tag resolved to `8.0.0-rc.22`, so the stable 7.10.0 line was selected. TypeScript 7.0.2 exceeded the installed lint parser's declared `<6` range; 5.9.3 was selected and verified. Node 26.9.0 was the actual available runtime; Node >=24 satisfies declared project requirements, but another Node release has not been smoke tested. Framework/SDK installation does not demonstrate OAuth, provider access, Sentry delivery or Clerk authentication.

pnpm explicitly permits build scripts for Prisma engines, Prisma and esbuild. The lockfile's minimum-age exemptions are exact resolved versions inserted by pnpm's registry policy during installation; they are reviewable and do not exempt all future versions. No external app dependency is fetched at shopper runtime.
