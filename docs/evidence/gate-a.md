# Gate A evidence

15 October 2026. **NOT PASSED.** Owner confirms development accounts are not ready. No development theme, actual ad click, app-pixel activation or checkout has been observed.

| Surface | Theme/browser | Path | Consent | Result | Required evidence |
|---|---|---|---|---|---|
| Local HTML fixture | No theme / Chromium 156 | Original without JavaScript | Not consulted | PASS (fixture only) | Playwright `proof.spec.ts` |
| Local HTML fixture | No theme / Chromium 156 | Original/A/B preview | No storage or measurement | PASS (fixture only) | Playwright `proof.spec.ts` |
| Local HTML fixture | No theme / Chromium 156 | Simulated selected-ad visit | Allowed | PASS: persistent assignment, separate assignment/render events | Simulated Shopify publisher; no real pixel |
| Local HTML fixture | No theme / Chromium 156 | Visit/storage denial/late grant/withdrawal | Unknown or denied | PASS: original/no new assignment; withdrawal clears proof storage | Playwright consent fixtures |
| Local event receiver | PostgreSQL 14.22 | Republished assignment | Synthetic proof | PASS: durable receipt and app-ID dedup | Playwright `receiver.spec.ts` |
| Actual product block | Dawn version TBD / desktop+mobile | Original/A/B, cart/variants | Allowed | NOT RUN | H01, official scaffolding and screenshots |
| Actual existing ad | Browser TBD | Delivered ad → product | Allowed | NOT RUN | Literal ad ID in actual resolved URL |
| Actual checkout | Dawn TBD / Chrome | Standard cart → checkout completion | Allowed | NOT RUN | Stored assignment + exposure + same-client purchase join |
| Actual checkout | Dawn TBD / Chrome | Available accelerated path | Allowed | NOT RUN | Actual pass/fail and redacted trace |
| Actual checkout | Dawn TBD / Safari | Standard and accelerated | Allowed | NOT RUN | Browser/path-specific identity result |
| Actual storefront | Dawn TBD / browser TBD | Page load / late pixel / consent timing | Unknown/denied/late/withdrawn | NOT RUN | Real privacy API/storage/event capture |
| Actual ad browser | Dawn TBD / Meta in-app browser | Ad → checkout | Allowed | NOT RUN | Feasible real-device check, limitations |

The receiver rejects unregistered proof stores and unexpected fields, bounds bodies to 8 KB, and commits before returning 202. It is deliberately a development-only public diagnostic. Public IDs/CORS do not authenticate browser data; forged events are possible. It is not T17 production ingestion (rate limiting, production relationship checks, quarantine and reconciliation remain pending).

Prototype assignment: FNV-1a over the UTF-8 JSON tuple `[visitorId, experimentId, seed]`, unsigned modulo 10000; original 0–3333, A 3334–6666, B 6667–9999. Two-arm helper uses 0–4999 / 5000–9999. This is development-only and still requires T14 golden vectors, persistence policy and distribution validation before production use. Proof storage expires after 30 days. App custom events retry at 0, 250 and 1000 ms with stable app event IDs; the prototype pixel tries delivery at most three times with bounded delays. Lost events remain lost, never reconstructed from a purchase. Event ordering and early-subscriber loss still need real pixel investigation.

`proof-join.ts` checks the store/client identity, assignment-before-purchase, seven-day boundary, and whether a received matching exposure exists. It is a diagnostic, not T28/T29 production purchase deduplication or attribution. Separate checkout events alone never pass Gate A.
