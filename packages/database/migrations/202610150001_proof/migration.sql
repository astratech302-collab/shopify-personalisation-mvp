CREATE TABLE "ProofEvent" (
 "id" TEXT PRIMARY KEY, "storeId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "occurredAt" TIMESTAMPTZ(3) NOT NULL,
 "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "payload" JSONB NOT NULL
);
CREATE INDEX "ProofEvent_storeId_clientId_occurredAt_idx" ON "ProofEvent"("storeId", "clientId", "occurredAt");
CREATE TABLE "WorkerHeartbeat" ("id" TEXT PRIMARY KEY, "updatedAt" TIMESTAMPTZ(3) NOT NULL);
