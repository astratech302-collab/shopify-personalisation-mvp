CREATE TABLE "IngestionWindow" (
 "storeId" TEXT NOT NULL REFERENCES "ShopInstallation"("id"), "minute" TIMESTAMPTZ(3) NOT NULL,
 "events" INTEGER NOT NULL CHECK ("events">=0), PRIMARY KEY ("storeId","minute")
);
CREATE INDEX "IngestionWindow_minute_idx" ON "IngestionWindow"("minute");
