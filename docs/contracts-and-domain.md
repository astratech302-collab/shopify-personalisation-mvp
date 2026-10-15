# T07 shared contracts and domain rules

All public boundaries use strict version-1 schemas exported by `packages/contracts`. Unknown fields and unsupported versions are rejected; validation errors must be converted with `toSafeError` rather than returning Zod input/issue objects to callers. The package is browser safe and the recursive dependency check forbids server, database, provider or encryption imports.

| Boundary | Schema | Decisions |
|---|---|---|
| Public configuration | `publicConfig` | Inactive, experiment or promoted experience; public installation ID; explicit page/ad/revision matching; positive freshness capped at 30 seconds; fixed seven-day policy |
| Copy | `copy` | Headline 120 Unicode code points, description 400; plain text; no markup, entities or non-text control characters; no silent trimming/decoding of copy |
| Drafts | `draftRequest` | Expected version for concurrency, original plus one/two alternatives, distinct selected ads; no supplied workspace/store authority |
| Allocation | `allocation` | Exactly `[5000,5000]` or `[3334,3333,3333]`; original receives the remainder |
| Custom events | `customEvent`, `pixelCustomEnvelope` | Assignment, rendered exposure and rendering failure remain different event types; assignment includes visitor ID; rendering requires exposure ID; wrapper includes observed Shopify client/event identity |
| Standard events | `standardEvent` | Allowlisted internal cart/checkout envelopes; checkout identity/amount can explicitly be null; amount is a nonnegative decimal string paired with currency |
| Ingestion | `ingestionBatch` | Versioned envelope, 1–20 custom/standard events; production/proof/preview/test environments are explicit |
| Reports | `report` | Received assignments include render failures; currency amounts stay separate; observation maturity is explicit; no winner claim exists in this pre-statistics contract |
| Errors | `safeError`, `DomainError`, `toSafeError` | Stable error codes/messages; arbitrary provider/checkout payloads and even altered Error.message values are discarded |

The same exported copy schema serves future merchant forms and server APIs. There is no production editor yet, and no separate browser implementation of these limits. Protocol schemas define our internal JSON contract; they do not assert that a Shopify pixel exposes every field or that checkout subtotal discount semantics have been verified. Those producer mappings and revenue semantics remain T18/T28.

Lifecycle actions are explicit in `packages/domain/src/lifecycle.ts`. Draft validation leads through validating/ready; publication passes through publishing; failures reach publish_failed; running can pause or end; paused resumes through publishing; ended is terminal. Editing a ready/validating draft invalidates readiness. Running/paused content cannot be edited through these rules. Publication/resume services must still revalidate readiness, immutable revision identity, reservation/cooldown, installation generation and stale jobs in T26/T27. Structural permission to transition is not launch approval.

Migration `202610150005_validation_states` adds validating/ready to the database state constraint. T07 tests cover Unicode boundaries, prohibited copy, unknown versions/fields, mismatched allocations, duplicate/misordered variants, invalid transitions, required exposure IDs, exact monetary strings, safe errors, report denominators and currency separation. No live provider access is needed for this ticket's local acceptance.
