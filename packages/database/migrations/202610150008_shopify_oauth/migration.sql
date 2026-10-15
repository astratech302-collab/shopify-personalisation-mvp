ALTER TABLE "ShopInstallation" ADD COLUMN "encryptedRefreshToken" TEXT;
ALTER TABLE "ShopInstallation" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMPTZ(3);
CREATE TABLE "ShopifyOAuthAttempt" (
 "stateHash" TEXT PRIMARY KEY,
 "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id"),
 "userId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
 "shopDomain" TEXT NOT NULL, "browserHash" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','processing','completed','failed')),
 "finishedAt" TIMESTAMPTZ(3),
 CHECK ("expiresAt">"createdAt")
);
CREATE INDEX "ShopifyOAuthAttempt_expiry_idx" ON "ShopifyOAuthAttempt" ("expiresAt");
