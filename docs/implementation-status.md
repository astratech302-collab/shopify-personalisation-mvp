# Implementation status

Updated 15 October 2026. This dedicated implementation workspace was initially empty. No applicable AGENTS.md was found in the workspace or its ancestor directories. The three authoritative planning documents were copied byte-for-byte into `docs/planning`; synced sources and the planning workspace were not changed.

**T07, T08 and T17 local implementations are complete and verified.** The user explicitly requested continuation while accounts are unavailable. T06's local schema prerequisites are verified; its upstream T01 platform scaffolding qualification remains open, so these local completions do not waive dependency acceptance or any platform gate. T05 has additional fixture-verified access services but remains partial pending actual Clerk sign-in/sign-out/session acceptance. H01 Shopify development access is now available; Meta setup and public receiver remain pending. No production editor/reporting experience has been built before Gate A.

Status meanings: **Complete locally** means that ticket’s local acceptance checks pass while named upstream/platform qualifications remain explicit. **Partial** includes concrete implemented local work with unmet criteria called out; **Blocked** means an external prerequisite is unavailable; **Not started** means no complete implementation of that ticket. A helper reused by a prototype does not complete the corresponding production ticket.

## All 40 tickets

| Ticket | Dependency from backlog | Status | Evidence / remaining acceptance |
|---|---|---|---|
| H01 — Provision development accounts and access | None | Partial — Shopify development access available | [Owner setup](external-setup.md), [Gate A matrix](evidence/gate-a.md). Shopify app installed by owner, Dawn test theme/product confirmed, authenticated CLI generation and unreleased extension upload verified. Meta and public HTTPS receiver remain pending. |
| T01 — Scaffold the repository and reproducible local environment | None | Partial — local foundation verified | [Setup](../README.md), [versions](dependency-versions.md), [actual checks](evidence/local-verification.md). Official extensions generated, platform build and unreleased version upload verified; [registration evidence](evidence/shopify-extension-registration.md). Store preview awaits interactive storefront password. |
| T02 — Prove block placement and safe text replacement | T01, H01 Shopify access | Partial — registered proof extension | [Liquid prototype](../extensions/personalise/blocks/personalise.liquid), [local browser checks](../tests/e2e/proof.spec.ts), [placement runbook](external-setup.md). Actual Dawn placement/parity/cart/screenshots not run. |
| T03 — Prove real existing-ad identification | T01, H01 real test ad | Partial — parser verified; live click blocked | [Parser](../packages/domain/src/ad-id.ts), [edge-case tests](../tests/unit/proof.test.ts). No delivered-ad click, dynamic expansion, imported account or real destination verified. |
| T04 — Prove exposure-to-checkout identity continuity | T01, T02, H01 Shopify access | Partial — diagnostic pipeline only | [Pixel prototype](../extensions/events/src/index.ts), [receiver](../apps/web/app/api/proof/events/route.ts), [join diagnostic](../packages/domain/src/proof-join.ts), [matrix](evidence/gate-a.md). No real pixel activation or checkout trace. |
| T05 — Add merchant authentication and workspace access | T01 | Partial — protected routes wired; real Clerk flow pending | [Access/session wiring and remaining work](workspace-access.md), [13 fixture identity/HTTP scenarios](../scripts/test-workspaces.ts), [closed-route browser check](../tests/e2e/receiver.spec.ts). No real Clerk sign-in/sign-out verified. |
| T06 — Implement the domain schema and database constraints | T01 | Partial — local schema verified; dependency T01 pending | [27-model schema](../packages/database/schema.prisma), [design/constraints](database-design.md), [fresh-schema and concurrency checks](../scripts/test-constraints.ts). Local server services are now present; T01 platform scaffolding remains open. |
| T07 — Build shared contracts and domain rules | T06 | Complete locally — upstream qualification retained | [Contract/domain design](contracts-and-domain.md), [boundary and transition tests](../tests/unit/contracts.test.ts). Strict versioned schemas, shared Unicode limits, fixed splits and safe errors verified. |
| T08 — Add secret storage, provider clients, and durable jobs | T06 | Complete locally — provider fixtures; upstream qualification retained | [Infrastructure and limits](infrastructure.md), [unit tests](../tests/unit/infrastructure.test.ts), [durability tests](../scripts/test-jobs.ts). Encryption, actual SDK fixture transport, durable queue/outbox/receipts and local operator retry verified. No live provider connection claimed. |
| T09 — Implement Shopify installation and secure workspace binding | T05–T08, H01 Shopify credentials | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T10 — Handle Shopify lifecycle and privacy webhooks | T08, T09 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T11 — Build product selection and page-target configuration | T07, T09 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T12 — Turn the prototype into a production theme block | Gate A, T07, T09, T11 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T13 — Implement privacy-aware eligibility and visitor identity | T07, T12 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T14 — Implement deterministic allocation and entry-ad binding | T07, T13 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T15 — Define and serve safe public configuration | T06–T08, T11 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T16 — Fetch configuration and render variants safely | T12–T15 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T17 — Build durable event ingestion | T06–T08 | Complete locally — platform pipeline still pending | [Ingestion contract and limits](ingestion.md), [23 database/HTTP checks](../scripts/test-ingestion.ts), [route checks](../tests/e2e/receiver.spec.ts). Durable receipt, reference checks, bounded input/rate, concurrent dedup and outage behaviour verified. |
| T18 — Build and activate the production app pixel | T04, T09, T13, T17 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T19 — Connect runtime events to the pixel reliably | T14, T16–T18 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| H02 — Confirm platform distribution and account access requirements | H01; start during Phase 0 | Blocked — owner platform decisions/access pending | [Distribution and review checklist](external-setup.md). Shopify distribution, Meta access/review, pilot/pricing and support contact undecided. |
| T20 — Implement Meta authorisation and account selection | T05, T08, H01 Meta setup | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T21 — Import and normalise Meta ads and insights | T06, T08, T20 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T22 — Build ads browsing and destination compatibility | T11, T21 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T23 — Implement real-click link verification | T03, T12, T17, T22 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T24 — Build experiment drafts and revisions | T05–T07, T11, T22 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T25 — Build authorised previews and onboarding health | T12, T16, T18, T24 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T26 — Implement preflight and experiment readiness | T19, T21, T23–T25 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T27 — Implement atomic publication, pause, and recovery | T08, T15, T24, T26 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T28 — Implement purchase normalisation and deduplication | T17–T19 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T29 — Attribute outcomes to stable visitor cohorts | T14, T19, T28 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T30 — Build reproducible reporting aggregates and APIs | T27–T29 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T31 — Add experiment sample planning and uncertainty | T07, T30 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T32 — Build results and tracking-health screens | T25, T30, T31 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T33 — Promote a variant and restore the original experience | T27, T32 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T34 — Implement retention, export, and deletion completion | T10, T17, T29, T30 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| T35 — Add monitoring, CI, deployment, and recovery procedures | T01, T08, T15, T27, T30 | Partial — CI skeleton only | [CI configuration](../.github/workflows/ci.yml); local checks verified. GitHub execution, hosting/CDN configuration, monitoring, recovery, production lifecycle and upstream dependencies remain unimplemented. |
| T36 — Run browser, performance, and provider integration acceptance | Gate C, T28–T35, H02 for claimed live merchant access | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| R01 — Add Shopify billing for a paid launch | T09, T27, H02 | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |
| R02 — Prepare review materials and onboard the first pilot | H02, T36, R01 if charging | Not started | Acceptance criteria remain pending in the [authoritative backlog](planning/mvp-development-backlog.md). |

## Gates

| Gate | Status | Evidence still required |
|---|---|---|
| A: T02–T04 | BLOCKED / NOT PASSED | Actual development Dawn block, delivered ad ID and same-browser standard checkout join; available accelerated-path pass/fail; real consent/timing matrix. [Detailed matrix](evidence/gate-a.md). |
| B: production serving/measurement | NOT STARTED | T11–T19 and required foundations; production modules and actual serving/measurement checks. |
| C: merchant-operated experiment | NOT STARTED | Authorised provider connections, ready experiment, owner-operated publish/pause and verified checkout evidence. |

## Acceptance evidence for work performed

- **T01:** exact dependency lockfile; local Postgres Compose definition and tested isolated-host fallback; migrations/seed; named env validation; health/worker heartbeat; graceful pg-boss/database shutdown; root lint/typecheck/unit/build/e2e commands; recursive browser/server dependency guard; Next/worker/prototype builds. Official generation, Shopify build and unreleased extension registration now pass; development preview remains pending. Docker Compose itself is not verified here because the daemon was stopped.
- **T02:** original copy escaped in Liquid; text changes operate only on block-owned nodes; dev-only original/A/B previews. Chromium fixture verifies JS-disabled original and all previews. Remaining: all actual Dawn placement/parity/cart/checkout and desktop/mobile theme evidence.
- **T03:** selected literal decimal ID only; missing/empty/malformed/unexpanded template/duplicate/conflicting/unknown inputs rejected; fbclid ignored. Remaining: actual delivered click against the chosen ad and real page, separate verified dynamic-format evidence if later supported.
- **T04:** allowlisted typed custom/checkout proof envelopes, SDK-typed pixel subscription code, store/client join diagnostic, durable receiver with app-ID dedup, explicit missing-exposure result, local consent/storage/withdrawal fixtures. Remaining: every live app-pixel/checkout/timing criterion. Raw checkout/customer contact payloads are never forwarded by the prototype. T17 now supplies the separate versioned receiver; production pixel wiring/attribution remain T18–T19/T28–T29 work.
- **T06:** local 27-model schema covers workspace/membership, shop, Meta hierarchy, page, experiment/mapping/revision/variant/publication, reservation, assignments/links/events/purchases/aliases/aggregates/outbox/audit and operational proof/heartbeat. Empty-schema migrations, concurrent reservation, foreign-key boundaries, immutable rows and exact decimal/alias constraints pass. T27 cooldown/publication services and T28 alias reconciliation remain future work; T08 now supplies the transactional outbox infrastructure. Keep T01 dependency explicit.
- **T07/T08/T17:** see the linked design and evidence documents; local completion retains all named upstream/platform qualifications.
- **T05:** fixture identity/access services pass; real Clerk authentication remains pending; merchant route enforcement is wired and fixture-tested.
- **T35:** CI file mirrors locally executed checks; it has not run on GitHub. No hosting deployment or recovery/monitoring claim.

## External prerequisites

H01: Shopify developer identity/app/client ID/development store with Dawn/test product, public HTTPS origin, real existing Meta test ad/account and authorised app identity. H02: distribution decision, other-business access/review state, privacy/deletion/support materials, pilot owner and pricing decision. See the [exact owner checklist](external-setup.md). Secrets belong only in environment/secret storage.

## Next ready work

1. Start the authenticated development preview using the registration evidence runbook; complete real Dawn placement and pixel activation checks.
2. Prioritise T02/T03/T04 actual platform checks and the Gate A evidence matrix before the editor/reporting UI.
3. T07/T08/T17 local work is verified. T05 Clerk session/proxy, sign-in/sign-up/account pages and protected workspace routes are now wired. Complete actual sign-in/sign-out/expiry acceptance with a Clerk development app. T09/T20 retain their provider/identity prerequisites. Other production tickets retain Shopify, Meta, Gate A or upstream service dependencies. Continue targeted local hardening if a new failing case is found; do not substitute fabricated platform evidence.
4. Preserve all unresolved dependencies in this register. Production publication, ad mutations/spend, billing, review approval and merchant onboarding remain outside the verified local result.

## Plan interpretation

The backlog excludes AI copy generation, so manual text only. The detailed plan's suggested optional AI does not expand scope. T07 now defines explicit validation/readiness/lifecycle actions and the database accepts validating/ready; T26/T27 must still enforce readiness, generation and publication constraints. No checkout revenue semantic is assumed from SDK installation; amount normalisation is deferred to T28's pinned-field verification. Development preview query parameters are confined to explicit proof-enabled development blocks and isolated fixtures; signed merchant previews remain T25.
