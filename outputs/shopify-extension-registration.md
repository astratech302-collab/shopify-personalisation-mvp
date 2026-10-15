# Shopify extension registration — 15 October 2026

Registered both official CLI-generated extensions for PersonalisationEngine (Geobuild organisation) in unreleased version `personalisationengine-3`.

- Development store: `geobuilddevstore.myshopify.com` (owner confirms app installed).
- Test product: `https://geobuilddevstore.myshopify.com/products/dummyproduct`.
- Theme: owner confirms unpublished Dawn copy named `Personalisation test`.
- Version: https://dev.shopify.com/dashboard/240969314/apps/435804962817/versions/1168443572225
- Theme handle: `personalisation-theme`; UID `065f57b4-ca6e-0e6e-a38b-513c56f1e39df5087f23`.
- Pixel handle: `personalisation-events`; UID `b978d29b-f3bd-ad44-43cd-e1f7a947c9e9d26a8f6f`.

Both UIDs came from Shopify CLI generation. Prototype backups remain under `work/extension-prototypes`. Theme TypeScript now lives in `packages/storefront/src/runtime.ts`, outside Shopify's supported upload directories. Build the theme asset with `pnpm build:extensions` before the official Shopify build/deploy; Shopify CLI builds the pixel itself. The small pixel guards avoid bundling runtime Zod; authoritative receiver validation remains unchanged. Generated sample star-rating block and console event logging were removed.

Checks: official `shopify app build --config development --no-input` passed; final unreleased deploy rebuilt and passed remote validation. Pixel: 2.9 KB original / approximately 1.1 KB compressed. Theme runtime: 1466 gzip bytes. Typecheck and lint pass; 44 unit tests pass including focused small-guard/shared-contract comparisons.

## Next action: development preview

Run in a local interactive terminal:

```sh
cd /Users/vedantmehra/Documents/Codex/2026-10-15/shopify-personalisation-mvp
pnpm shopify app dev --config development --store geobuilddevstore.myshopify.com --theme 189205413962 --no-update
```

Enter the storefront password only at the terminal prompt. The noninteractive preview attempt stopped at that prompt; no live preview was verified. Leave the command running while testing. Do not release the uploaded version just to preview it.

After preview starts, use its theme editor link to add `Personalisation proof` to the test product template on the unpublished theme. Keep proof disabled until placement and original copy are checked. No catalog text edits are required.

Pixel registration does not activate tracking. Pixel activation still needs the development HTTPS proof receiver, matching public store ID and endpoint, plus `webPixelCreate`. Required processing consent is analytics, marketing and preferences; sale-of-data declaration is disabled for this proof. No pixel activation, actual checkout trace, Dawn placement or Gate A acceptance is claimed. App authentication/workspace binding remains T09 work.

Preview correction: Shopify CLI 4.9.4 parses the app-dev theme flag as a numeric ID despite help mentioning names. Authenticated theme list confirmed `Personalisation test` is unpublished, ID `189205413962`. Dawn is also unpublished; the current live theme is `test-data`. Use the numeric ID above; do not publish the test copy.

Verified follow-up: app dev with numeric theme ID successfully reached “Ready, watching for changes in your app”. Development preview is running against theme `189205413962`; local preview is http://127.0.0.1:9293. Theme editor: https://geobuilddevstore.myshopify.com/admin/themes/189205413962/editor . This supersedes the earlier password-blocked preview attempt. Actual block placement and pixel activation remain unverified.
