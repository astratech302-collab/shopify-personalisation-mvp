# AI implementation handoff

Use this prompt in the application repository with both plan files attached or copied into `docs/`.

---

Build the Shopify ad-to-page personalisation MVP described in the attached development backlog. The detailed build plan explains the architecture; the backlog's product contract and ticket acceptance criteria govern implementation. If the documents conflict, use the backlog's more explicit MVP decisions and record the difference.

Begin by inspecting this repository, its AGENTS.md instructions, existing stack, and current implementation. Preserve useful existing work. If this is only the planning workspace, create application code in a new `app/` directory and adapt monorepo paths accordingly; do not overwrite the plans or synced reference files under `sources/`. In a dedicated application repository, use the normal repository root.

Create `docs/implementation-status.md` containing every H/T/R ticket, dependency, status, and evidence link. Begin with T01, then prioritise T02–T04 and Gate A. Avoid building a polished dashboard before proving real ad identification, text rendering, and exposure-to-checkout attribution.

For each ticket:

1. Confirm dependencies and inspect relevant existing code.
2. Implement the smallest complete change that satisfies its acceptance criteria.
3. Run the appropriate checks and record actual results.
4. Update the status file and relevant setup documentation.
5. Continue to the next ready ticket within the authorised development scope.

Treat the H tickets as external prerequisites. Prepare exact setup instructions when credentials, account access, or owner actions are needed. Continue independent local work using clearly labelled fixtures. Never claim a mock, manually pasted URL, or separate checkout event proves a real integration.

Verify current platform APIs against official documentation and supported tooling when implementing Shopify/Meta integration details. Do not invent SDK functions, permissions, creative fields, extension capabilities, dynamic URL parameter behaviour, or cross-domain identity guarantees.

Keep the product narrow: one store and selected Meta ad account per workspace, one enrolling experiment per store, one product page, original plus up to two alternatives, fixed splits, manual existing-ad tracking setup, and consent-permitted same-browser measurement. Render approved text in the app's own block. No live AI calls, Meta calls, or Shopify Admin calls while shoppers load a page.

Never expose integration secrets, edit product catalog copy to implement personalisation, mutate live Meta ads, create ad spend, publish an unreviewed production deployment, or claim release approval that has not been granted. Development/staging changes and tests are the initial execution scope; prepare a concrete release candidate and report any remaining external release actions.

Use deterministic assignment, immutable revisions, separate assignment/exposure events, durable ingestion, purchase deduplication, and explicit unmatched outcomes. Count failed-to-render assignments in the primary measured cohort. Keep checkout subtotal by currency and label browser-derived revenue accurately.

For statistical conclusions, use a documented fixed-horizon approach checked against an independent reference. Descriptive dashboard updates must not become repeated automatic winner decisions. Respect the seven-day outcome window and pilot overlap restriction.

At the end of each implementation session, report completed tickets, acceptance evidence, actual test results, external/live checks still pending, and the next actionable ticket. Mark blocked work honestly and continue unrelated ready work; do not substitute a partial feature for a completed acceptance gate.

---

Suggested first instruction after attaching these files:

“Inspect the repository, create the implementation status file, and implement T01. Then work through T02–T04 where access permits. Report Gate A evidence and any external setup still required before starting the production dashboard.”
