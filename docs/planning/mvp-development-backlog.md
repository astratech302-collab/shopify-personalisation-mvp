# Shopify personalisation MVP: development backlog

This is the implementation handoff for the accompanying `shopify-personalisation-mvp-build-plan.md`. It converts that design into independently reviewable tickets. Defaults below resolve routine product decisions so an implementation agent can proceed. Platform support questions remain explicit validation tasks.

## Product contract

- Standalone merchant dashboard; Shopify is the first and only commerce integration.
- Dawn product pages first. A merchant places an app block and configures its original headline and supporting description.
- One store and one selected Meta ad account per workspace initially.
- One live experiment per store; one target product page per experiment.
- One or several selected ads with the same supported destination can enter that experiment.
- Original plus one or two text alternatives. Fixed equal allocation, stable per browser visitor.
- No price changes, product catalog edits, redirects, arbitrary HTML, universal page editor, or automatic edits to Meta ads.
- Only approved text is served. AI copy generation is outside this backlog.
- Seven-day purchase observation window; same-browser, consent-permitted measurement.
- Purchase reporting is based on observed pixel events. No promise of complete attribution, verified payment settlement, refunds, or cross-device tracking.
- Material changes create a new experiment. Historical assignments and revisions remain immutable.
- A completed test can promote a variant to an explicit published experience for the selected ads. Promotion remains reversible and does not rewrite product data.

## Fixed implementation choices

Use a pnpm TypeScript monorepo: Next.js web app, Node worker, PostgreSQL, Prisma, pg-boss, Tailwind, Clerk for merchant identity, official Shopify JavaScript API library, server-side Meta HTTP adapter, Liquid theme extension, Shopify Web Pixel extension, Vitest, Playwright, Sentry, and GitHub Actions. Use Render for web/worker/database and Cloudflare for public configuration caching.

Pin compatible stable versions at scaffolding time and record them. Keep browser-safe contracts separate from server code. The prior plan contains the platform references; verify exact current API fields, scopes, and SDK signatures when implementing an integration. Do not invent APIs to make a ticket appear complete.

## How to use the backlog

Process dependencies in order. Ticket numbers are the recommended sequence, not permission to skip unmet dependencies. `H` tickets are external setup; implementation can continue with fixtures where explicitly allowed. `T` tickets are engineering work. `R` is release-only work.

For each ticket, record status, implementation summary, verification commands/results, and any remaining external prerequisite. Acceptance criteria are completion requirements, not suggested improvements. A simulated provider response never counts as a passed live integration check.

Size guide: S = a narrow component; M = several related components; L = significant integration. Split an L ticket if it cannot be reviewed in one coherent change. Do not expand scope merely to improve a size estimate.

### Global definition of done

- All ticket acceptance criteria have evidence or are explicitly marked blocked/unverified; no silent substitution of a mock for a live check.
- Relevant type checking, linting, builds, and meaningful tests pass.
- Every merchant data operation enforces workspace/store access. Public configuration contains only intentional public content.
- Secrets are absent from client bundles, public responses, fixtures, screenshots, and logs.
- Failure states have a usable recovery action and preserve default storefront behaviour.
- Update setup documentation and `.env.example` when configuration changes.
- Keep preview, development, and automated test data out of production reports.
- Do not alter any synced reference files under `sources/`.

## Phase 0 — External setup and technical proof

### H01 — Provision development accounts and access

**Owner:** Project owner, with setup instructions prepared by the agent. **Depends on:** None.

Provide a Shopify developer account/app registration, development store running Dawn, test products, Meta developer app, accessible test ad account, an existing website-destination test ad, and a public HTTPS development callback address. Production accounts can follow later.

**Acceptance criteria**

- [ ] Agent supplies a configuration checklist listing callback URLs, extension registration steps, required environment-variable names, and permissions to investigate.
- [ ] Credentials are entered through local environment/secret management, never committed or pasted into a report.
- [ ] Shopify development store and selected Meta account are accessible to the authorised test identity.
- [ ] The owner provides an ad that can be used for a real-click check; no agent creates spend or changes a live campaign merely to satisfy this ticket.
- [ ] Missing access is tracked by name; independent local implementation proceeds with documented fixtures.

### T01 — Scaffold the repository and reproducible local environment

**Depends on:** None. **Size:** M. **Scope:** Root tooling, `apps/web`, `apps/worker`, shared packages, extension skeletons.

Create the monorepo, database service for local development, environment validation, and scripts. Scaffold extensions using supported Shopify tooling rather than invented manifests.

**Acceptance criteria**

- [ ] A fresh checkout can install dependencies, start PostgreSQL, apply migrations, and run web and worker using documented commands.
- [ ] Required missing environment values produce named startup errors; optional external integrations can be disabled in development explicitly.
- [ ] Root commands cover lint, typecheck, unit tests, production build, and end-to-end tests.
- [ ] The web health endpoint and worker heartbeat run; shutdown closes database/queue connections.
- [ ] Client packages cannot import token encryption, database, or provider secrets.

**Verification:** Fresh-environment setup smoke test and builds for web, worker, and extensions.

### T02 — Prove block placement and safe text replacement

**Depends on:** T01, H01 Shopify access. **Size:** M. **Scope:** Theme extension prototype; proof documentation.

Use hard-coded original/A/B copy to establish that the intended page layout can be supported before building the editor.

**Acceptance criteria**

- [ ] Block is placed in the product template through the Dawn theme editor and renders original text with JavaScript disabled.
- [ ] Original heading/text can be removed or disabled through supported theme controls without a duplicate visible heading; document exact steps.
- [ ] Original, A, and B render on the same product URL using an explicit development preview mechanism.
- [ ] Changes are limited to the app block; price, cart, product variant selection, and checkout still work.
- [ ] Mobile/desktop screenshots document visual parity of the control and any limitations of the block placement.

**Verification:** Published development theme and browsers; a local DOM test alone is insufficient.

### T03 — Prove real existing-ad identification

**Depends on:** T01, H01 real test ad. **Size:** M. **Scope:** URL matching prototype and evidence.

Start with `lp_ad=<literal-ad-id>`. Investigate dynamic ad ID expansion only as an additional supported option.

**Acceptance criteria**

- [ ] At least one real ad click reaches the intended Shopify product page with a stable identifier that matches the selected ad.
- [ ] Evidence distinguishes actual ad delivery/click behaviour from a manually constructed URL or Ads Manager preview.
- [ ] Missing, malformed, duplicate/conflicting, and unknown parameters resolve to a documented non-eligible state.
- [ ] The app never interprets `fbclid` as a Meta ad ID.
- [ ] A dynamic parameter template is documented as supported only after its actual expansion is verified for the claimed format.
- [ ] Any ad configuration change requiring the owner's action is documented; no spending or live campaign mutation is automated.

**Verification:** Redacted resolved URL, matched imported/manual test ID, and supported-format notes.

### T04 — Prove exposure-to-checkout identity continuity

**Depends on:** T01, T02, H01 Shopify access. **Size:** L. **Scope:** Pixel prototype, minimal event receiver, checkout-path matrix.

Publish a namespaced custom exposure event, receive it in the app pixel with Shopify client identity, and join it to an observed checkout completion. Do not build the full reporting system yet.

**Acceptance criteria**

- [ ] Original and treatment exposure events arrive with an app exposure ID, variant, experiment identifier, and pixel client ID.
- [ ] A permitted standard checkout completion joins to the exposure from the same browser on the standard cart checkout path.
- [ ] Test at least one available accelerated checkout path; record pass/fail and do not claim unsupported paths work.
- [ ] Unknown/denied consent produces original content and no app experiment storage/analytics.
- [ ] Pixel initialisation delay and consent timing are investigated; event loss is recorded rather than silently reconstructed from purchases.
- [ ] A matrix records theme, browser, checkout path, consent state, actual result, and outstanding limitations.

**Verification:** Redacted event trace demonstrating the join, not merely separate page and purchase events.

### Gate A — Technical feasibility

T02, T03, and T04 must pass for at least one supported end-to-end path before investing in the production editor/reporting experience. Local infrastructure work can continue while external checks are pending. If identity continuity fails, document and implement an alternative association mechanism before claiming purchase attribution.

## Phase 1 — Identity, persistence, and provider foundations

### T05 — Add merchant authentication and workspace access

**Depends on:** T01. **Size:** M. **Scope:** Web authentication, membership services, protected routes.

**Acceptance criteria**

- [ ] Merchant can sign in/out through Clerk and create their first workspace; one owner membership is created idempotently.
- [ ] Workspace scope comes from verified identity and membership, never directly from a request body's workspace ID.
- [ ] Anonymous requests cannot access merchant APIs; users in workspace B cannot read or mutate workspace A's records.
- [ ] Merchant mutations apply appropriate CSRF/origin protection for the chosen session mechanism.
- [ ] Expired sessions and unauthorised actions return consistent errors without revealing whether another tenant's object exists.

**Verification:** Two-user/two-workspace integration scenarios, including object IDs copied across tenants.

### T06 — Implement the domain schema and database constraints

**Depends on:** T01. **Size:** L. **Scope:** `packages/database`, domain schemas.

Create migrations for workspace/membership, shop installation, Meta connection/account/ad hierarchy, page target, experiment/ad mappings/revisions, publication, assignments, identity links, events, purchases, aggregates, jobs/outbox, and audit records. T05 can add identity-specific fields without replacing shared schema work.

**Acceptance criteria**

- [ ] An empty database migrates successfully and the development seed is repeatable.
- [ ] Provider IDs are strings; monetary values use decimal-safe storage with currency; timestamps are UTC with original provider timezone retained separately.
- [ ] Foreign keys/compound constraints prevent cross-store mappings and duplicate provider objects within their proper account scope.
- [ ] A database-enforced reservation permits at most one enrolling experiment per store, including concurrent publish attempts.
- [ ] Assignment, pixel event, and purchase uniqueness rules are documented and enforced; order-ID/checkout-ID aliasing has a migration path.
- [ ] Immutable revisions cannot be edited through normal application services; event indexes support expected identity/date lookups.

**Verification:** Constraint and migration integration tests, including concurrent reservation attempts.

### T07 — Build shared contracts and domain rules

**Depends on:** T06. **Size:** M. **Scope:** `packages/contracts`, `packages/domain`.

**Acceptance criteria**

- [ ] Versioned schemas define public configuration, custom events, standard-event envelopes, draft requests, and reports.
- [ ] Default limits are explicit: headline 120 Unicode code points, description 400, plain text only; limits are validated consistently on server and client.
- [ ] Experiment transitions are explicit; illegal transitions return typed errors.
- [ ] Equal allocations are represented in integer basis points: 5000/5000 or 3334/3333/3333, with control receiving the extra basis point.
- [ ] Safe errors do not contain provider tokens or raw checkout/customer payloads.

**Verification:** Boundary cases for text, schema versions, invalid transitions, and allocation sums.

### T08 — Add secret storage, provider clients, and durable jobs

**Depends on:** T06. **Size:** M. **Scope:** Server-only integration infrastructure and worker.

**Acceptance criteria**

- [ ] Integration tokens are encrypted with authenticated encryption and a key version; tampering fails closed.
- [ ] Shopify/Meta adapters set timeouts, classify retryable errors, redact credentials, and expose typed errors.
- [ ] Queue jobs support idempotency keys, bounded exponential backoff/jitter, a terminal failure state, and operator-visible retry.
- [ ] A database transaction can write state and an outbox record; jobs survive process restart and do not duplicate the intended effect.
- [ ] Webhook work can be acknowledged after durable receipt and processed asynchronously.

**Verification:** Restart/retry, duplicate execution, encryption tamper, and simulated throttle tests.

### T09 — Implement Shopify installation and secure workspace binding

**Depends on:** T05–T08, H01 Shopify credentials. **Size:** L. **Scope:** Shopify adapter, install/callback routes.

**Acceptance criteria**

- [ ] Standalone installation uses the supported authorization-code flow and validates callback signature, expiry, state, and initiating membership.
- [ ] Invalid shop hosts, replayed state, mismatched workspace, and tampered callbacks are rejected before storing a token.
- [ ] An installed shop attaches to the initiating workspace only; another workspace cannot silently claim it.
- [ ] Requested access is limited to tested needs, initially product reads and pixel access; permissions and token expiry metadata are persisted.
- [ ] Reinstallation and token replacement are idempotent; a failed callback leaves a recoverable connection state.
- [ ] A real development-store installation can perform the required GraphQL calls.

**Verification:** Mocked callback failure tests plus live installation evidence.

### T10 — Handle Shopify lifecycle and privacy webhooks

**Depends on:** T08, T09. **Size:** M. **Scope:** Webhook receiver, lifecycle jobs, audit trail.

**Acceptance criteria**

- [ ] Raw-body HMAC validation rejects invalid deliveries and accepts valid ones; webhook identities deduplicate processing.
- [ ] Uninstall disables new serving/enrolment, stops future store jobs, invalidates config cache, and disconnects merchant access to provider operations.
- [ ] Scope changes update health and block capabilities that no longer have permission.
- [ ] Required privacy topics are configured and processed; export/redaction jobs have observable status and recorded outcomes.
- [ ] Reinstall races do not apply an old uninstall cleanup job to the new installation generation.

**Verification:** Signed fixtures, duplicate deliveries, uninstall/reinstall race, and development webhook delivery.

## Phase 2 — Production storefront and pixel collection

### T11 — Build product selection and page-target configuration

**Depends on:** T07, T09. **Size:** M. **Scope:** Product adapter, page-target API and picker.

**Acceptance criteria**

- [ ] Merchant can search paginated products and select an eligible online-store product in their own shop.
- [ ] Storefront domain, product identity, canonical path, locale, and block target are stored explicitly.
- [ ] Normalisation strips tracking parameters but preserves meaningful page/locale distinctions; external hosts and invalid paths are rejected.
- [ ] Deleted/unavailable products and unverified theme/locale combinations show actionable incompatibility.
- [ ] Page selection never writes product title or description.

**Verification:** Representative URL/domain/locale fixtures and live product selection.

### T12 — Turn the prototype into a production theme block

**Depends on:** Gate A, T07, T09, T11. **Size:** M. **Scope:** Theme extension and placement guidance.

**Acceptance criteria**

- [ ] Block exposes original copy and bounded style settings, with escaped Liquid output and stable data attributes.
- [ ] Merchant instructions explain original-theme heading removal, control parity, and restoration on uninstall.
- [ ] Script initialises once per block lifecycle, tolerates theme section reloads, and releases observers/listeners when removed.
- [ ] Runtime receives only public installation/page/block identifiers; private credentials are absent.
- [ ] Theme editor is recognised and excluded from production measurement.
- [ ] Unsupported placement does not alter arbitrary DOM selectors or silently modify theme source.

**Verification:** Dawn desktop/mobile check, JavaScript-disabled check, repeated section reload, source inspection.

### T13 — Implement privacy-aware eligibility and visitor identity

**Depends on:** T07, T12. **Size:** M. **Scope:** Storefront privacy/identity module.

**Acceptance criteria**

- [ ] One documented processing policy maps required allowed-processing methods to enrolment; it matches pixel privacy configuration.
- [ ] Unknown, unavailable, or denied permission leaves default copy without app-owned experiment identifiers or analytics storage.
- [ ] Permitted visitors receive a cryptographically random store-scoped identifier with a documented maximum 30-day lifetime.
- [ ] Storage denial/private-browser failure safely defaults without unstable repeat randomisation or exceptions.
- [ ] Consent arriving late does not enrol midway through the existing page view; subsequent eligible loads can enrol.
- [ ] Withdrawal stops new app analytics, clears relevant app-owned identifiers, and restores original copy without reporting a synthetic exposure.

**Verification:** Consent/storage state matrix and browser checks from T04.

### T14 — Implement deterministic allocation and entry-ad binding

**Depends on:** T07, T13. **Size:** M. **Scope:** Browser-safe assignment module.

**Acceptance criteria**

- [ ] Documented hash/version/seed and basis-point boundaries give identical assignments for identical input across browser and test environments.
- [ ] Persisted assignments remain stable on reload, return visit, and another selected ad click within the experiment.
- [ ] First eligible ad ID is immutable; the page and selected ad must match configuration before initial enrolment.
- [ ] Control follows the same eligibility/event code path as alternatives.
- [ ] Wrong product, unknown ad, unsupported locale, expired config, and paused experiment do not enrol.
- [ ] Existing valid assignments may resume on the target page without a repeated ad parameter; expired visitors receive no inferred historical identity.

**Verification:** Golden hash vectors, exact bucket boundaries, seeded distribution sanity check, and revisit scenarios.

### T15 — Define and serve safe public configuration

**Depends on:** T06–T08, T11. **Size:** M. **Scope:** Public-config serializer/route and CDN setup instructions.

**Acceptance criteria**

- [ ] Schema contains only public IDs, page/ad matching, approved text, allocation, revision, mode, and freshness information.
- [ ] Inactive, deleted, or uninstalled stores return an inactive response; there is no fallback to a previously active revision at the origin.
- [ ] Origin/cache headers and explicit CDN rule provide a maximum 30-second shared freshness lifetime, ETag support, and no stale-on-error serving of active config.
- [ ] Client freshness includes actual cache age; a cached response must not restart the freshness clock as if newly generated.
- [ ] Browser has access to required response headers across origins; credentials are not required for this public route.
- [ ] Cache keys isolate stores and cannot be affected by arbitrary visitor parameters; no visitor assignment is cached globally.

**Verification:** Serializer snapshot/security check, header/cache-age tests, and live CDN behaviour when available.

### T16 — Fetch configuration and render variants safely

**Depends on:** T12–T15. **Size:** M. **Scope:** Storefront fetch/render module.

**Acceptance criteria**

- [ ] Default copy renders immediately; active-config fetch has a 200 ms initial application deadline from runtime start.
- [ ] Late, invalid, expired, offline, or unsupported config causes no late treatment swap on the current page view.
- [ ] Headline and description are changed together using text operations in the owned block only.
- [ ] Assignment, render success, and render failure are separate signals; a missing/hidden/detached block never produces a success exposure.
- [ ] Original/control is also checked and instrumented as a rendered experience.
- [ ] Replaced blocks restore safely; no repeated rewrite loop, full-page hiding, or duplicate event spam occurs.

**Verification:** Network delay/failure, detached element, long copy, and theme reload browser tests.

### T17 — Build durable event ingestion

**Depends on:** T06–T08. **Size:** M. **Scope:** Public ingestion endpoint, validation, persistence.

**Acceptance criteria**

- [ ] Versioned payloads validate required IDs, store/revision/variant relationships, time bounds, length limits, allowed event names, and decimal amounts/currencies.
- [ ] Cross-store or invented revision/variant references are rejected; public ingestion IDs are not treated as secret authentication.
- [ ] An accepted response follows durable storage, and duplicate custom/Shopify IDs produce one stored logical event.
- [ ] Late events for an ended revision remain eligible within its attribution/ingestion policy; validation does not require an experiment to be currently running.
- [ ] Limits cover request body size, event batch size, and request rate; no raw contact/address/full-query data is retained.
- [ ] Retryable server errors and permanent payload errors are distinguishable to the pixel client.

**Verification:** Forged reference, replay, invalid value, oversized payload, database outage, and duplicate-concurrency tests.

### T18 — Build and activate the production app pixel

**Depends on:** T04, T09, T13, T17. **Size:** L. **Scope:** Pixel extension, Shopify pixel activation service.

**Acceptance criteria**

- [ ] Activation creates or updates the app's pixel idempotently with correct settings and privacy declarations.
- [ ] Pixel subscribes to assignment/render/failure custom events and standard cart/checkout/purchase events.
- [ ] Forwarded payloads include only approved fields, Shopify event/client IDs, app IDs, timestamps, and necessary numeric purchase identifiers/value.
- [ ] Bounded delivery retry handles transient failures with stable IDs; no retry on permanent schema rejection.
- [ ] Missing fields are represented explicitly and never substituted with guessed customer identity.
- [ ] No DOM editing, merchant integration tokens, email, phone, or address enters the pixel implementation or outgoing payload.

**Verification:** Live event capture, pixel activation replay, and transmitted-field inspection.

### T19 — Connect runtime events to the pixel reliably

**Depends on:** T14, T16–T18. **Size:** M. **Scope:** Custom-event publisher and identity-link worker.

**Acceptance criteria**

- [ ] Each assignment has a stable assignment ID; each logical page exposure has a unique exposure ID reused for retries only.
- [ ] Assignment publication precedes its exposure publication; retries tolerate pixel subscription delay and stop after a documented bound.
- [ ] Republished custom events deduplicate by app event identity even if Shopify wraps them in different event IDs.
- [ ] Backend creates a store-scoped assignment-to-pixel-client link and tolerates out-of-order assignment/exposure arrivals.
- [ ] A delayed purchase cannot fabricate an exposure; missing links remain visibly unmatched.
- [ ] Failed-to-render assignments remain in the measured assignment cohort when their assignment event was received.

**Verification:** Early/late subscriber, retry, out-of-order, control, treatment failure, and real checkout traces.

### Gate B — Serving and measurement foundation

Before production reporting is considered reliable, demonstrate a stable assignment, valid rendered exposure, deduplicated purchase join, consent-denied fallback, and pause/default behaviour using the production modules. Preserve explicit unsupported paths.

## Phase 3 — Meta integration and experiment management

### H02 — Confirm platform distribution and account access requirements

**Owner:** Project owner, with evidence prepared by the agent. **Depends on:** H01; start during Phase 0.

**Acceptance criteria**

- [ ] Shopify production distribution method is selected knowingly; a single custom-distribution app is not used to onboard unrelated pilot brands.
- [ ] Meta app has the actual access/review configuration required for other merchants' ad accounts; account verification/review status is recorded.
- [ ] Review assets list required demo steps, test credentials/access method, privacy policy, deletion instructions, and support contact.
- [ ] Pending approvals are release blockers, not reported as completed integration checks.

### T20 — Implement Meta authorisation and account selection

**Depends on:** T05, T08, H01 Meta setup. **Size:** L. **Scope:** Meta connection flow and adapter.

**Acceptance criteria**

- [ ] Callback verifies state/initiator and binds access to the correct workspace; user selects one accessible ad account.
- [ ] Request read-only permissions first; document and verify any endpoint-specific extra access rather than requesting broad management permissions by default.
- [ ] Encrypted token, granted permissions, expiry metadata, selected account, currency/timezone, and connection health persist.
- [ ] Denied authorisation, missing permission, expired/revoked token, and unavailable account produce reconnectable states.
- [ ] Disconnect removes usable access and stops sync; existing approved storefront configuration continues according to the documented merchant controls.
- [ ] No Meta token appears in browser data, URLs rendered by the dashboard, or logs.

**Verification:** Provider-failure fixtures and live authorised account connection.

### T21 — Import and normalise Meta ads and insights

**Depends on:** T06, T08, T20. **Size:** L. **Scope:** Import jobs and Meta normalisation adapters.

**Acceptance criteria**

- [ ] Paginated campaigns/ad sets/ads import idempotently with external IDs, statuses, creative summaries/hashes, destinations, and parameter settings.
- [ ] Unsupported catalog/carousel/flexible/multi-destination formats are clearly classified; missing fields are not fabricated.
- [ ] Initial import, 30-minute refresh, manual refresh with a 60-second cooldown, and rolling daily insight refresh are implemented as adjustable defaults.
- [ ] Throttles retry with backoff; one account's failure does not block other queue work.
- [ ] Creative/destination changes invalidate relevant preflight evidence and flag review without silently editing published copy.
- [ ] Last successful sync and stale/failed status are visible; Meta values retain their currency/date/timezone semantics.

**Verification:** Multi-page fixtures, duplicate sync, partial failure/retry, changed creative, and live import comparison.

### T22 — Build ads browsing and destination compatibility

**Depends on:** T11, T21. **Size:** M. **Scope:** Ads list/detail and mapping service.

**Acceptance criteria**

- [ ] Merchant can filter/search their imported ads and view creative summary, destination, status, compatibility, and last sync.
- [ ] Only supported ads whose verified destination matches the selected product/page can be selected together.
- [ ] One ad can map to every variant through its experiment; several selected ads can share the same experiment.
- [ ] Unknown/multiple destinations and campaign-only identification show clear setup/unsupported states.
- [ ] Ads and account data remain tenant-isolated throughout list and detail routes.

**Verification:** Same-page multi-ad and different-page rejection scenarios, including cross-tenant IDs.

### T23 — Implement real-click link verification

**Depends on:** T03, T12, T17, T22. **Size:** M. **Scope:** Tracking instructions and preflight evidence collector.

**Acceptance criteria**

- [ ] Merchant sees a literal-ID link configuration and any separately verified dynamic template without overwriting unrelated tracking parameters.
- [ ] Synthetic parser checks are labelled separately from actual real-click evidence.
- [ ] A narrowly scoped QA session records resolved identifier/page and matching ad without creating production experiment traffic.
- [ ] Real-click evidence is tied to store, ad, destination and configuration/creative version; material changes invalidate it.
- [ ] Evidence requiring owner attestation is labelled manual, with time/actor; software does not claim it can cryptographically prove an ad delivery from a URL alone.
- [ ] Missing identifiers, conflicting IDs, wrong destination, or stripped parameters block readiness with a concrete remedy.

**Verification:** Known-good real click plus invalid/conflicting/missing identifier fixtures.

### T24 — Build experiment drafts and revisions

**Depends on:** T05–T07, T11, T22. **Size:** M. **Scope:** Experiment CRUD services and editor.

**Acceptance criteria**

- [ ] Draft specifies product/page, selected eligible ads, original copy, one/two alternatives, and fixed equal allocation.
- [ ] Copy uses shared length/plain-text validation with readable errors.
- [ ] Concurrent updates use revision/version checks; a stale save cannot overwrite a newer draft silently.
- [ ] Running revision cannot be edited; cloning produces a separate draft with no historical assignments.
- [ ] Original block copy is compared with the control snapshot; mismatch invalidates readiness.
- [ ] Editor never updates Shopify product catalog fields or Meta ad creative.

**Verification:** Draft CRUD, stale-write conflict, invalid ad mapping, and immutable-live-revision tests.

### T25 — Build authorised previews and onboarding health

**Depends on:** T12, T16, T18, T24. **Size:** M. **Scope:** Preview controls, signed preview context, setup dashboard.

**Acceptance criteria**

- [ ] Merchant can preview original/A/B at mobile and desktop widths on the actual supported page.
- [ ] Preview context is signed, time-limited, scoped to store/revision, and cannot be used as an arbitrary content injection endpoint.
- [ ] Preview renders do not affect production assignment/exposure/purchase reports, including test checkout events associated with the QA flow.
- [ ] Onboarding separately reports install, published-theme block placement, control parity, pixel receipt, Meta sync, real-click verification, and checkout-path evidence.
- [ ] Browser detection and manual confirmation are labelled accurately; installation is not presented as proof that a block is active.

**Verification:** Expired/tampered preview, production-count exclusion, and live original/A/B visual checks.

### T26 — Implement preflight and experiment readiness

**Depends on:** T19, T21, T23–T25. **Size:** M. **Scope:** Validation service and readiness screen.

**Acceptance criteria**

- [ ] Server recomputes readiness from current connection/scopes, page/block state, matching ads, control parity, copy, weights, and test evidence.
- [ ] At least one supported checkout path has a verified exposure-to-purchase result; unsupported paths remain disclosed.
- [ ] Each failure has a stable machine-readable code and merchant-facing remedy.
- [ ] Client-side flags cannot bypass readiness; evidence has revision/version context and stale evidence is rejected.
- [ ] Passing the screen produces a validation snapshot used and rechecked by publication.

**Verification:** One failing prerequisite at a time, stale evidence, and forged ready flag.

### T27 — Implement atomic publication, pause, and recovery

**Depends on:** T08, T15, T24, T26. **Size:** L. **Scope:** Lifecycle APIs and publication worker.

**Acceptance criteria**

- [ ] Publish reserves the store, freezes a revision, and records an outbox job transactionally; double-clicks create one logical publish.
- [ ] State is `publishing` until public configuration and cache activation are verified; failures remain actionable `publish_failed` states.
- [ ] Retry cannot activate an older revision over a newer generation or resurrect a paused/uninstalled store.
- [ ] Pause/end update public config and invalidate caches; new page loads stop enrolling/rendering test treatment within the verified 60-second target.
- [ ] Paused experiment is resumable only with identical content/allocation and valid readiness. Ending stops enrolment permanently while preserving outcome collection through seven days.
- [ ] A new test cannot enrol while the prior cohort's seven-day outcome window is open, unless an explicitly designed overlap-exclusion rule is implemented and tested; the pilot default is to wait.
- [ ] Merchant sees operation status, retry, audit history, and a way to restore default content.

**Verification:** Duplicate/concurrent publish, outbox crash, purge failure, stale job, pause race, and live cache propagation.

### Gate C — Merchant-operated experiment

A merchant can connect both providers, select real existing ads, prepare copy, verify links and checkout tracking, preview, publish, and pause without developer intervention beyond supported initial setup.

## Phase 4 — Attribution, reporting, and decisions

### T28 — Implement purchase normalisation and deduplication

**Depends on:** T17–T19. **Size:** M. **Scope:** Purchase-event processor.

**Acceptance criteria**

- [ ] Parse only verified fields from the pinned checkout-event schema; preserve currency and decimal-safe amounts.
- [ ] Deduplicate repeated events by order identity when present; maintain tested checkout-to-order aliases so adding an order ID later cannot create a second purchase.
- [ ] Missing/ambiguous identity is quarantined or unmatched, never guessed.
- [ ] Revenue field semantics are documented and tested; UI label says observed checkout subtotal with the confirmed discount treatment.
- [ ] Post-purchase/thank-you repeat events do not inflate counts; refunds/settlement are explicitly outside this metric.

**Verification:** Same order/different event IDs, late order ID, multiple purchases, missing identity, and mixed currency fixtures.

### T29 — Attribute outcomes to stable visitor cohorts

**Depends on:** T14, T19, T28. **Size:** M. **Scope:** Attribution worker/domain rules.

**Acceptance criteria**

- [ ] Outcome joins use store-scoped observed identity links and an existing assignment, never email/IP/time proximity.
- [ ] Window is seven days from first assignment; before-assignment and after-window purchases are excluded.
- [ ] Purchases arriving after pause/end can still join within the observation window and documented delivery grace period.
- [ ] Out-of-order identity/purchase events are reconciled idempotently; unmatched events remain inspectable with safe reasons.
- [ ] One purchaser contributes at most one converted visitor per experiment, while their distinct purchases can contribute separate revenue.
- [ ] First entry-ad attribution stays immutable and no purchase is counted in overlapping pilot experiments.

**Verification:** Boundary timestamps, delayed delivery, multiple purchases, changed ad entry, unmatched identity, and cross-store fixtures.

### T30 — Build reproducible reporting aggregates and APIs

**Depends on:** T27–T29. **Size:** M. **Scope:** Aggregation jobs and reporting API.

**Acceptance criteria**

- [ ] Primary denominators use received unique assignments, including render failures; exposures are a separate diagnostic.
- [ ] Produce assigned visitors, render success, cart/checkout visitor rates, converted visitors, purchase count, subtotal, and revenue per visitor.
- [ ] Revenue is separated by currency; visitor-based and order-based counts are labelled distinctly.
- [ ] Aggregates update idempotently and can be rebuilt from retained source records without changing known fixture results.
- [ ] Reports distinguish enrolment dates, follow-up window, immature cohorts, excluded QA traffic, and late-arriving events.
- [ ] Meta clicks/spend remain separate ad-level data; no invented exact variant spend or ROAS is calculated.

**Verification:** A documented synthetic cohort with manually specified expected results, compared to incremental processing and full rebuild.

### T31 — Add experiment sample planning and uncertainty

**Depends on:** T07, T30. **Size:** M. **Scope:** Statistical domain module and experiment plan fields.

**Acceptance criteria**

- [ ] Before publishing, merchant supplies an assumed baseline conversion and minimum detectable relative lift; confidence defaults to 95% and power to 80%, recorded immutably.
- [ ] Use a documented fixed-horizon two-proportion sample-planning method and adjustment for one/two comparisons against control; round required sample up.
- [ ] Validate the statistical implementation against an independent trusted reference with reproducible expected fixtures; do not rely solely on tests that restate the same formula.
- [ ] Descriptive conversion intervals are labelled as such; repeated dashboard viewing never triggers an automatic significance/winner claim.
- [ ] Formal comparisons are shown only after required cohorts and seven-day outcome windows mature; insufficient sample or invalid assumptions produce an explanatory state.
- [ ] Sample-ratio imbalance and tracking failure warnings suppress misleading winner language; per-ad slices are diagnostic.

**Verification:** Reference fixtures, zero/all-conversion boundaries, one/two-alternative adjustment, and immature-cohort checks.

### T32 — Build results and tracking-health screens

**Depends on:** T25, T30, T31. **Size:** M. **Scope:** Reporting UI.

**Acceptance criteria**

- [ ] Original/A/B comparison shows primary metrics, denominator definitions, uncertainty, sample progress, and observation maturity.
- [ ] Tracking panel separates rendering failure, identity-link gaps, unmatched purchases, stale Meta sync, and operational service failures.
- [ ] No-data, immature-data, failed-connection, and ended-experiment states have appropriate next actions.
- [ ] Ad/date/currency filters do not silently change the predeclared formal comparison; exploratory slices are clearly labelled.
- [ ] Mobile layout and accessible tables/forms work with long names and zero values.
- [ ] Dashboard states measurement limitations without claiming complete conversion coverage.

**Verification:** Known cohort displayed values, filter behaviour, empty/error states, and keyboard/mobile review.

### T33 — Promote a variant and restore the original experience

**Depends on:** T27, T32. **Size:** M. **Scope:** Promotion workflow and runtime experience mode.

**Acceptance criteria**

- [ ] Merchant can manually select original/A/B and see the exact copy, destination, and selected ads before promotion.
- [ ] Promotion ends new test enrolment and publishes a separately versioned non-experiment experience; old test data remains immutable.
- [ ] Prior cohort outcomes remain observable through their window; post-promotion new visitors do not inflate the old test.
- [ ] Runtime can serve the promoted copy for selected ad traffic without pretending a new experiment is running.
- [ ] Pause/restoration returns to the theme block's original copy with the same cache-propagation contract.
- [ ] No automatic winner choice, global catalog edit, or Meta ad edit occurs.

**Verification:** Promote/pause/retry, new-versus-existing cohort, and storefront copy checks.

## Phase 5 — Operational readiness and pilot

### T34 — Implement retention, export, and deletion completion

**Depends on:** T10, T17, T29, T30. **Size:** M. **Scope:** Privacy/data lifecycle jobs and documentation.

**Acceptance criteria**

- [ ] Default raw-event/identity retention is 90 days; expiry jobs are idempotent and do not leave orphaned purchase links.
- [ ] Relevant shop/customer requests process available identifiers accurately and document when anonymous browsing data cannot be linked to a named person.
- [ ] Redaction updates or rebuilds affected aggregates where required; retained aggregates meet the documented policy rather than merely being labelled anonymous.
- [ ] Uninstall cleanup honours installation generations, provider requirements, and actual retention/deletion policy.
- [ ] Backup retention, deletion propagation limits, and audit evidence are documented without storing deleted sensitive payloads in the audit trail.

**Verification:** Known linked dataset export/delete, anonymous-only request, repeat deletion, retention cutoff, and reinstall-race tests.

### T35 — Add monitoring, CI, deployment, and recovery procedures

**Depends on:** T01, T08, T15, T27, T30. **Size:** M. **Scope:** CI/hosting configuration, operational docs.

**Acceptance criteria**

- [ ] CI runs applicable checks and extension builds; secrets/environment values are isolated between staging and production.
- [ ] Web, worker, database migrations, public config/CDN, and extension releases have a documented deployment sequence.
- [ ] Logs/error reporting redact secrets and checkout/customer fields; correlation IDs connect publish/sync/ingestion jobs safely.
- [ ] Health checks/alerts cover failed publication, persistent sync errors, ingestion errors, queue backlog, and worker failure.
- [ ] Backups and a restore exercise are documented; rollback understands database compatibility and storefront configuration/schema versions.
- [ ] Operator can disable store enrolment/serving and retry failed work without editing database rows manually.

**Verification:** Staging deployment, induced worker/queue/provider failure, redaction check, and restore/rollback rehearsal.

### T36 — Run browser, performance, and provider integration acceptance

**Depends on:** Gate C, T28–T35, H02 for claimed live merchant access. **Size:** L. **Scope:** Release test matrix and fixes.

**Acceptance criteria**

- [ ] Complete happy path and failure matrix on Dawn: actual existing ad → stable original/A/B assignment → pixel exposure → supported checkout → report.
- [ ] Chrome, Safari, mobile viewport, and feasible Meta in-app browser paths have recorded results; unsupported combinations are disclosed.
- [ ] Verify denied/unknown/withdrawn consent, blocked storage, unavailable config, missing block, revoked Meta access, uninstall, and preview exclusion.
- [ ] Verify duplicate/out-of-order events, same purchase under different event IDs, and seven-day attribution boundaries.
- [ ] Storefront bundle is ≤15 KB gzipped excluding Shopify infrastructure, or a documented scope change explains the measured exception.
- [ ] No full-page hiding or app-caused layout shift in supported fixtures; compare LCP/INP against baseline under the same repeatable mobile conditions and fix material regressions.
- [ ] Fresh page loads observe pause within 60 seconds; reports update within five minutes of accepted events under pilot load.
- [ ] Every claimed supported scripted checkout joins/deduplicates correctly; no unrun live checks are marked passed.

**Verification:** Versioned acceptance report with actual measurements, screenshots, test traces, remaining limitations, and release decision.

### R01 — Add Shopify billing for a paid launch

**Depends on:** T09, T27, H02. **Size:** M. **Condition:** Required before charging through the public App Store launch; a free pilot may defer it explicitly.

**Acceptance criteria**

- [ ] Implement the supported Shopify-provided pricing/billing path selected from current official documentation.
- [ ] Backend verifies entitlements rather than trusting a browser success redirect.
- [ ] Upgrade/cancel/test-mode/error states have verified behaviour and no duplicate charges.
- [ ] Loss of entitlement stops new experiment enrolment according to the disclosed plan; historical reports remain available according to the product policy.
- [ ] Storefront fallback and outcome follow-up are handled deliberately rather than breaking shoppers' pages.

**Verification:** Shopify-supported billing test flow and entitlement-state fixtures. Production charges are outside development testing.

### R02 — Prepare review materials and onboard the first pilot

**Depends on:** H02, T36, R01 if charging. **Size:** M. **Scope:** Merchant documentation, review pack, pilot evidence.

**Acceptance criteria**

- [ ] Setup instructions cover block placement, original-copy restoration, Meta account selection, identifiers, test checkout, publishing, pause, and reconnect.
- [ ] Privacy/deletion/support pages describe actual behaviour and measurable-attribution limits.
- [ ] Review demonstration uses working flows and authorised access; approval status is recorded as pending until granted.
- [ ] One authorised merchant completes setup and runs an experiment through the dashboard on a supported production surface.
- [ ] Pilot report captures setup time, identifier readiness, render reliability, observed tracking issues, and merchant feedback; it does not require positive uplift to pass.
- [ ] Multi-brand onboarding begins only through a permitted distribution/access route.

**Verification:** Completed pilot checklist, review submission materials, and recorded release status.

## Milestones and sequencing

| Milestone | Required tickets | Completion evidence |
|---|---|---|
| Feasibility | H01, T01–T04 | Gate A trace, actual ad click and checkout identity proof |
| Secure foundation | T05–T10 | Tenant isolation, install/lifecycle, durable jobs |
| Storefront foundation | T11–T19 | Gate B original/A/B serving and pixel pipeline |
| Merchant experiment | T20–T27, H02 progressing | Gate C owner-operated publish/pause |
| Reliable interpretation | T28–T33 | Known-cohort reports and promotion |
| Pilot ready | T34–T36, H02 | Measured acceptance report |
| Launch | R01 if paid, R02 | Appropriate approvals and first merchant onboarding |

T17 can be built before the rest of Phase 2 to support event testing. T20/T21 can begin once provider foundations are ready, but do not let Meta approval delay local serving/measurement fixtures. T31's immutable sample-plan fields must be integrated into T26/T27 before a real experiment is published; earlier publishing tests can use explicit test-only plans. Cross-ticket integration remains part of each milestone's acceptance.

## Required handoff after every ticket

Report:

1. Ticket ID and status: complete, partial, or blocked.
2. Behaviour implemented and files changed.
3. Acceptance criteria satisfied, with concrete evidence.
4. Checks run and actual results; separate fixture/browser/live-provider evidence.
5. External prerequisites or platform support still unverified.
6. Next ticket whose dependencies are satisfied.

Never label the complete app ready because individual unit tests passed. Gates require end-to-end behaviour with the relevant real platform surfaces.
