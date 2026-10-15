# T05 local access-service preparation

`packages/integrations/src/workspaces.ts` implements idempotent first-owner workspace creation, membership checks, membership-scoped experiment reads, owner-only member changes and a same-origin mutation guard. A stable hashed owner-workspace identity prevents concurrent first-workspace requests from creating multiple owner records. Resource reads join current membership in the same query; privileged member changes lock the owner membership inside their transaction. Another workspace's object ID returns the same not-found result as an absent object.

The service is server only. Protected routes obtain user ID and session ID through Clerk’s server `auth()` helper, with `clerkMiddleware` in Next.js 16’s `proxy.ts`. Merchant endpoints are `/api/workspaces`, `/api/workspaces/:workspaceId` and its experiment-detail path. POST accepts only a workspace name and checks Origin against APP_URL; request-body or forwarded identity headers never supply membership authority. Disabled auth mode returns unauthorised rather than granting a development identity. The 13 local two-user/two-workspace and HTTP scenarios use explicit fixture sessions; they do not establish real Clerk authentication.

T05 remains **partial**. Clerk registration/keys and actual sign-in/sign-out/session-expiry acceptance still remain. Proxy/session guards, sign-in/sign-up/account UI, owner-workspace form and protected merchant routes are implemented and build successfully. The real browser check confirms closed access in disabled mode, including forged identity headers. The existing setup checklist names the required Clerk environment values. Do not expose these service functions directly to unauthenticated request-body identities.


Enable merchant identity independently from provider connections:

```sh
# Set these in the root .env, before running dev or rebuilding:
AUTH_MODE=clerk
CLERK_SECRET_KEY=YOUR_DEVELOPMENT_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_DEVELOPMENT_PUBLISHABLE_KEY
# Shopify and Meta may remain unavailable:
INTEGRATIONS_MODE=disabled
```

Create or use a Clerk development application, configure its local application origin to APP_URL, and keep both keys out of committed files/reports. Run `pnpm dev`, visit `/sign-up` or `/sign-in`, then `/account` to create the first workspace; use the UserButton to sign out. Verify two distinct real users, copied object IDs, sign-out, expired sessions and rejected origins before T05 is marked complete. These actual identity-provider checks have not run. There is no need to enable Shopify/Meta just to exercise Clerk.

API and SDK signatures were checked against installed `@clerk/nextjs` 7.9.15 and current official [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) and [proxy/session middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware). The local Next.js route/proxy/client-boundary documentation was read before editing framework files.
