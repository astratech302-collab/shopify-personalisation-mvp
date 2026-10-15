# Development update — 15 October 2026

Implemented the local Shopify workspace connection flow, encrypted expiring access/refresh tokens, a basic merchant connection form, and signed generation-aware uninstall/scope webhook handling. Shopify can now be enabled independently while Meta stays disabled.

Verified: 64 unit tests, 21 OAuth database/HTTP checks, 13 signed lifecycle checks, 13 browser/API tests, existing database/jobs/isolation checks, production build, and worker lifecycle. The previous initial GitHub CI run passed; this continuation adds both new database suites to CI.

A random encryption key was saved directly into the ignored local `.env`; no secret was printed or committed. Live merchant connection is still disabled. Clerk development keys and an HTTPS app origin are missing; the Shopify app callback must also be configured to that origin. Meta credentials can be added later.

T09 remains partial pending real Clerk/OAuth/GraphQL evidence. T10 remains partial pending actual subscription registration, webhook delivery, compliance/privacy workflows and future cache integration. Production storefront serving, experiments, Meta import, attribution and reporting remain future work. Gate A has not passed.

The owner has confirmed the real Dawn original/A/B preview now changes copy. Cart/checkout tracking is still unverified. Keep the theme unpublished.

Detailed implementation and setup are in `docs/shopify-connection.md` in the repository.
