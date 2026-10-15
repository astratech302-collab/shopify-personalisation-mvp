ALTER TABLE "Outbox" DROP CONSTRAINT "Outbox_idempotencyKey_key";
ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_workspaceId_idempotencyKey_key" UNIQUE ("workspaceId","idempotencyKey");
ALTER TABLE "Outbox" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_status_check" CHECK ("status" IN ('pending','completed','failed'));
ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_attempts_check" CHECK ("attempts">=0);
CREATE TABLE "WebhookReceipt" (
 "storeId" TEXT NOT NULL REFERENCES "ShopInstallation"("id"), "installationGeneration" INTEGER NOT NULL,
 "providerEventId" TEXT NOT NULL, "topic" TEXT NOT NULL,
 "outboxId" TEXT NOT NULL REFERENCES "Outbox"("id"), "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("storeId","installationGeneration","providerEventId")
);
