# H01 / H02 external setup

Status, 15 October 2026: owner supplied Shopify app Client ID `6384f07eda5fc4427ddc9ad1a5d9ee9b`, confirmed development store `geobuilddevstore.myshopify.com`, and reports entering credentials in the local `.env`. Credential validity, authenticated CLI linking, and app installation remain unverified. Meta accounts remain pending. Gate A remains unverified.

Latest Shopify progress: app installed by owner; Dawn test theme and product confirmed; official theme/pixel extensions generated and uploaded as unreleased version `personalisationengine-3`. See [registration handoff](shopify-extension-registration.md). Interactive preview and pixel activation remain pending.

## H01: development accounts

1. Create/access a Shopify developer organisation, development app registration, and development store. Install Dawn and create a test product. Provide the `*.myshopify.com` domain, app client ID, product URL, and organisation access for the developer. Client IDs are public; app secrets go in local `.env` or secret management only.
2. Choose a public HTTPS development origin, called `DEV_ORIGIN` below. Configure Shopify app URL to `DEV_ORIGIN`, redirect URL to `DEV_ORIGIN/api/shopify/callback`, and Meta valid OAuth redirect URI to `DEV_ORIGIN/api/meta/callback`. The Shopify callback is implemented locally; Meta callback remains a reserved interface and is not implemented. Changing config alone does not complete installation. Local URL is `http://localhost:3000`; a tunnel needs an explicitly configured development listener. Do not expose the fixture receiver as a production endpoint.
3. Set `APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `SHOPIFY_SCOPES=read_products,write_pixels,read_customer_events`. Product reads and app-pixel creation are the planned initial access. Do not request product writes, theme writes, orders, or contact-field scopes for the prototype. Verify protected-customer-data requirements for the actual order/client/checkout fields in the registered app.
4. Authenticate Shopify CLI in an interactive local terminal by linking the authorised development app. The attempted `app generate extension --no-input` command here returned **“Authorization is required to continue”**. Do not fabricate a manifest or UID. Back up the unregistered prototype directories, generate real extensions, then copy the prototype sources into the generated folders while preserving official manifests/UIDs:

   ```sh
   mkdir -p work/extension-prototypes
   mv extensions/personalise work/extension-prototypes/personalise
   mv extensions/events work/extension-prototypes/events
   pnpm shopify app config link
   # Select the owner's DEVELOPMENT app; replaces the local placeholder config.
   pnpm shopify app generate extension --template theme_app_extension --name personalise
   pnpm shopify app generate extension --template web_pixel --name events
   # Select TypeScript when prompted.
   ```

   Copy the saved `personalise/src/runtime.ts` and `personalise/blocks/personalise.liquid` into their generated locations. Preserve generated supporting files as needed; replace sample blocks to avoid an unrelated storefront widget. Copy the saved `events/src/index.ts` into the generated pixel's TypeScript entry point and reconcile its package dependencies with the pinned workspace SDK. Run `pnpm install`, `pnpm typecheck`, `pnpm build:extensions`, and the supported `pnpm shopify app build`. Reconcile CLI generation paths with this repository, recording the actual generated files. Restore backups if generation fails. Never manually invent Shopify-assigned UIDs.
5. In the **generated** pixel manifest set all four privacy declarations explicitly: `analytics=true`, `marketing=true`, `preferences=true`, `sale_of_data="disabled"`. The first three match the prototype's allowed-processing checks. The last declares no sale/sharing use; the owner must confirm it matches the actual merchant/app policy before release. Add `storeId` and `endpoint` settings using the documented `single_line_text_field` type. Neither value is a secret. Activate via `webPixelCreate` in the authorised development app after T09; this mutation is not implemented yet. Set endpoint to `DEV_ORIGIN/api/proof/events`, a public development store ID, `PROOF_STORE_ID` to that same ID, `PROOF_STOREFRONT_ORIGIN` to the store's exact HTTPS origin, and `PROOF_MODE=true` in the **development-only** receiver environment.
6. Use `pnpm shopify app dev` with the selected development store and the generated/linked app configuration. Do not publish a production app release. Record the generated extension versions and theme ID.
7. Create a Meta developer app with the Marketing API use case and an authorised developer/test identity that can access an existing website-destination ad. Provide app ID, selected account ID and literal ad ID. Set `META_APP_ID`, `META_APP_SECRET`, and the API version actually offered/verified for that app in `META_API_VERSION`; none has been selected or queried in this session. Investigate `ads_read` for read-only account/ad access first. Endpoint-specific additional access is a T20 verification task. Do not request `ads_management` by default.
8. The owner chooses an existing test ad and controls any tracking changes. Begin with literal `lp_ad=THE_ACTUAL_AD_ID`, preserving unrelated URL parameters. A pasted URL and Ads Manager preview are parser checks, not real delivery evidence. `fbclid` is never an ad ID. Dynamic `{{ad.id}}` expansion remains unverified and unsupported until an actual click proves it for the claimed format. No agent changes a live campaign or creates spend.
9. To finish merchant identity acceptance, create a separate Clerk development application and set `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Set `AUTH_MODE=clerk` independently from `INTEGRATIONS_MODE`; visit `/sign-up`, `/sign-in` and `/account` to test the wired merchant flow. Real Clerk sign-in/sign-out has not yet been observed. Generate a 32-byte token encryption key locally for `TOKEN_ENCRYPTION_KEY`, with `TOKEN_ENCRYPTION_KEY_VERSION=1`; T08 now supplies authenticated encryption helpers and validates canonical 32-byte base64 keys. Shopify can be enabled independently with `SHOPIFY_INTEGRATION_MODE=enabled` while `INTEGRATIONS_MODE=disabled`; this requires Clerk, HTTPS and encryption credentials. The global `INTEGRATIONS_MODE=enabled` still requires both providers. No raw credentials belong in evidence, messages, or screenshots. The local T09 Shopify connection/refresh flow is implemented and fixture-tested; live acceptance and T20 Meta flow remain pending.

## T02: development Dawn placement runbook

On a copy of the development theme, create a product template dedicated to the test product and assign that product to it. In the theme editor open that template, Product information, Add block, Apps, Personalisation proof. Place it at the original title/text location, set the exact original copy, and save. Dawn commonly exposes removable Title and Description blocks: remove those corresponding blocks through the editor controls, recording their prior order/settings so they can be restored. **The exact Dawn release and these controls have not been tested here.** If the controls do not exist or parity cannot be achieved, stop and record unsupported placement; never inject arbitrary DOM selectors or edit catalog text.

First disable the proof toggle and JavaScript; verify original copy. Then enable the development proof toggle only on this dedicated development template, supply the literal test ad ID/public proof store ID, and compare `?lp_preview=original`, `A`, `B` on the same product URL. These are deliberately unmeasured development previews, not the signed production previews planned in T25. Check price, variant selector, cart and checkout. Record mobile/desktop screenshots of the actual theme and restore the theme's default blocks before removing the app.

## T03 / T04: evidence collection

Record an actual delivered-ad click with redacted resolved host/path and `lp_ad`, ad ID and destination/creative context, test actor and time. Do not keep full query strings containing unrelated identifiers.

For consent-permitted standard cart checkout capture received `app:experiment_assigned`, `app:variant_rendered` and `checkout_completed` records with a matching store-scoped Shopify `clientId`. Preserve app assignment/exposure IDs and timestamps. Run `pnpm proof:trace OBSERVED_PIXEL_CLIENT_ID` to show a join from the stored records; a later purchase must never create a synthetic exposure. Repeat with an available accelerated checkout, original and treatment, denied/unknown consent, late pixel initialisation, Safari and Chrome. Record event loss and unsupported paths. All these checks are currently **not run**; see the Gate A matrix.

## H02: distribution and release access

- Record an explicit Shopify distribution decision before onboarding merchants. Public distribution/review is the path to investigate for unrelated brands. Custom distribution is scoped to one store or stores within the same Plus organisation. Do not use one custom-distribution registration for unrelated pilots. Distribution selection is an owner action; it has not been made.
- Inspect Meta's actual app dashboard for the permissions/access level needed for other businesses' accounts, business verification, app review and production mode. No app dashboard is available, and the Meta authorisation reference could not be retrieved in this session. Requirements and approval status remain unverified rather than guessed.
- Assemble working demo steps for Shopify install, block placement, Meta authorisation/account selection, existing-ad verification, consent-permitted checkout, preview, publication/pause, reconnect and deletion. Provide reviewer access through an approved test-access mechanism, plus privacy/deletion pages and a real support contact. These assets are pending working flows and owner contact information.
- Free versus paid pilot is undecided. R01 can only be deferred through an explicit free-pilot decision. Platform approvals, billing and live merchant onboarding remain release blockers.

## Official references checked

- [CLI generation](https://shopify.dev/docs/api/shopify-cli/app/app-generate-extension) and [app creation](https://shopify.dev/docs/api/shopify-cli/app/app-init).
- [Theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/build).
- [App pixel generation, privacy declarations, settings, scopes and activation](https://shopify.dev/docs/apps/build/marketing/build-web-pixels).
- [Allowed-processing methods and consent-change event](https://shopify.dev/docs/api/customer-privacy).
- [Custom event publication](https://shopify.dev/docs/api/web-pixels-api/emitting-data) and [checkout event fields](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed).
- [Shopify distribution restrictions](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method).
- [Meta authorisation reference](https://developers.facebook.com/docs/marketing-api/overview/authorization/) — inaccessible through the research tool; live app-dashboard verification still required.
