-- Domain foundations. All tenant relationships carry store/workspace IDs explicitly.
CREATE TABLE "Workspace" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Membership" (
 "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id"), "userId" TEXT NOT NULL,
 "role" TEXT NOT NULL CHECK ("role" IN ('owner','member')), PRIMARY KEY ("workspaceId","userId")
);
CREATE TABLE "ShopInstallation" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL UNIQUE REFERENCES "Workspace"("id"),
 "shopDomain" TEXT NOT NULL UNIQUE, "publicId" TEXT NOT NULL UNIQUE,
 "generation" INTEGER NOT NULL DEFAULT 1 CHECK ("generation">0),
 "status" TEXT NOT NULL DEFAULT 'pending', "encryptedToken" TEXT, "keyVersion" INTEGER,
 "scopes" TEXT[] NOT NULL DEFAULT '{}', "tokenExpiresAt" TIMESTAMPTZ(3),
 UNIQUE ("workspaceId","id")
);
CREATE TABLE "MetaConnection" (
 "workspaceId" TEXT PRIMARY KEY REFERENCES "Workspace"("id"), "encryptedToken" TEXT,
 "keyVersion" INTEGER, "expiresAt" TIMESTAMPTZ(3), "scopes" TEXT[] NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE "AdAccount" (
 "workspaceId" TEXT NOT NULL REFERENCES "MetaConnection"("workspaceId"), "id" TEXT NOT NULL,
 "currency" CHAR(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'), "providerTimezone" TEXT NOT NULL,
 PRIMARY KEY ("workspaceId","id"), UNIQUE ("workspaceId")
);
CREATE TABLE "Campaign" (
 "workspaceId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "id" TEXT NOT NULL, "name" TEXT NOT NULL,
 PRIMARY KEY ("workspaceId","accountId","id"), FOREIGN KEY ("workspaceId","accountId") REFERENCES "AdAccount"("workspaceId","id")
);
CREATE TABLE "AdSet" (
 "workspaceId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "id" TEXT NOT NULL,
 PRIMARY KEY ("workspaceId","accountId","id"), FOREIGN KEY ("workspaceId","accountId","campaignId") REFERENCES "Campaign"("workspaceId","accountId","id")
);
CREATE TABLE "Ad" (
 "workspaceId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "adSetId" TEXT NOT NULL, "id" TEXT NOT NULL,
 "destination" TEXT, "creativeVersion" TEXT, "compatibility" TEXT NOT NULL DEFAULT 'unverified', "syncedAt" TIMESTAMPTZ(3),
 PRIMARY KEY ("workspaceId","accountId","id"), FOREIGN KEY ("workspaceId","accountId","adSetId") REFERENCES "AdSet"("workspaceId","accountId","id")
);
CREATE TABLE "PageTarget" (
 "storeId" TEXT NOT NULL REFERENCES "ShopInstallation"("id"), "id" TEXT NOT NULL,
 "productId" TEXT NOT NULL, "host" TEXT NOT NULL, "canonicalPath" TEXT NOT NULL, "locale" TEXT NOT NULL, "blockId" TEXT NOT NULL,
 PRIMARY KEY ("storeId","id"), UNIQUE ("storeId","host","canonicalPath","locale","blockId")
);
CREATE TABLE "Experiment" (
 "storeId" TEXT NOT NULL, "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "pageTargetId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','publishing','publish_failed','running','paused','ended')),
 "version" INTEGER NOT NULL DEFAULT 1, "endedAt" TIMESTAMPTZ(3),
 PRIMARY KEY ("storeId","id"), UNIQUE ("workspaceId","storeId","id"),
 FOREIGN KEY ("workspaceId","storeId") REFERENCES "ShopInstallation"("workspaceId","id"),
 FOREIGN KEY ("storeId","pageTargetId") REFERENCES "PageTarget"("storeId","id")
);
CREATE TABLE "Revision" (
 "storeId" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "id" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("storeId","experimentId","id"), FOREIGN KEY ("storeId","experimentId") REFERENCES "Experiment"("storeId","id")
);
CREATE TABLE "Variant" (
 "storeId" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "id" TEXT NOT NULL,
 "headline" TEXT NOT NULL CHECK (char_length("headline") BETWEEN 1 AND 120),
 "description" TEXT NOT NULL CHECK (char_length("description")<=400),
 "allocationBps" INTEGER NOT NULL CHECK ("allocationBps" BETWEEN 1 AND 10000),
 PRIMARY KEY ("storeId","experimentId","revisionId","id"),
 FOREIGN KEY ("storeId","experimentId","revisionId") REFERENCES "Revision"("storeId","experimentId","id")
);
CREATE TABLE "AdMapping" (
 "workspaceId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "adId" TEXT NOT NULL,
 PRIMARY KEY ("storeId","experimentId","adId"),
 FOREIGN KEY ("workspaceId","storeId","experimentId") REFERENCES "Experiment"("workspaceId","storeId","id"),
 FOREIGN KEY ("workspaceId","accountId","adId") REFERENCES "Ad"("workspaceId","accountId","id")
);
CREATE TABLE "StoreReservation" (
 "storeId" TEXT PRIMARY KEY, "experimentId" TEXT NOT NULL,
 "reservedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "releaseAfter" TIMESTAMPTZ(3),
 FOREIGN KEY ("storeId","experimentId") REFERENCES "Experiment"("storeId","id")
);
-- A running/publishing experiment requires the unique reservation, even under direct SQL.
CREATE FUNCTION require_store_reservation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status" IN ('publishing','running') AND NOT EXISTS (SELECT 1 FROM "StoreReservation" r WHERE r."storeId"=NEW."storeId" AND r."experimentId"=NEW."id") THEN
  RAISE EXCEPTION 'store_reservation_required' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER experiment_reservation BEFORE INSERT OR UPDATE ON "Experiment" FOR EACH ROW EXECUTE FUNCTION require_store_reservation();
CREATE FUNCTION protect_reservation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "Experiment" e WHERE e."storeId"=OLD."storeId" AND e."id"=OLD."experimentId" AND e."status" IN ('running','publishing')) OR OLD."releaseAfter">CURRENT_TIMESTAMP THEN
  RAISE EXCEPTION 'store_reservation_in_use' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER reservation_in_use BEFORE UPDATE OR DELETE ON "StoreReservation" FOR EACH ROW EXECUTE FUNCTION protect_reservation();
CREATE TABLE "Publication" (
 "storeId" TEXT NOT NULL, "id" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "revisionId" TEXT NOT NULL,
 "generation" INTEGER NOT NULL, "mode" TEXT NOT NULL CHECK ("mode" IN ('experiment','published','inactive')),
 "status" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("storeId","id"), UNIQUE ("storeId","generation"),
 FOREIGN KEY ("storeId","experimentId","revisionId") REFERENCES "Revision"("storeId","experimentId","id")
);
CREATE TABLE "Assignment" (
 "storeId" TEXT NOT NULL, "id" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "revisionId" TEXT NOT NULL,
 "variantId" TEXT NOT NULL, "visitorId" TEXT NOT NULL, "entryAdId" TEXT NOT NULL,
 "assignedAt" TIMESTAMPTZ(3) NOT NULL, "environment" TEXT NOT NULL CHECK ("environment" IN ('production','proof','preview','test')),
 PRIMARY KEY ("storeId","id"), UNIQUE ("storeId","experimentId","visitorId"),
 FOREIGN KEY ("storeId","experimentId","revisionId","variantId") REFERENCES "Variant"("storeId","experimentId","revisionId","id"),
 FOREIGN KEY ("storeId","experimentId","entryAdId") REFERENCES "AdMapping"("storeId","experimentId","adId")
);
CREATE TABLE "IdentityLink" (
 "storeId" TEXT NOT NULL, "assignmentId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
 "linkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("storeId","assignmentId","clientId"), FOREIGN KEY ("storeId","assignmentId") REFERENCES "Assignment"("storeId","id")
);
CREATE INDEX "IdentityLink_client_idx" ON "IdentityLink"("storeId","clientId","linkedAt");
CREATE TABLE "Event" (
 "storeId" TEXT NOT NULL REFERENCES "ShopInstallation"("id"), "id" TEXT NOT NULL,
 "source" TEXT NOT NULL CHECK ("source" IN ('custom','shopify')), "providerEventId" TEXT NOT NULL,
 "assignmentId" TEXT, "clientId" TEXT NOT NULL, "kind" TEXT NOT NULL, "occurredAt" TIMESTAMPTZ(3) NOT NULL,
 "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "payload" JSONB NOT NULL,
 "environment" TEXT NOT NULL CHECK ("environment" IN ('production','proof','preview','test')),
 PRIMARY KEY ("storeId","id"), UNIQUE ("storeId","source","providerEventId"),
 FOREIGN KEY ("storeId","assignmentId") REFERENCES "Assignment"("storeId","id")
);
CREATE INDEX "Event_identity_date_idx" ON "Event"("storeId","clientId","occurredAt");
CREATE TABLE "Purchase" (
 "storeId" TEXT NOT NULL REFERENCES "ShopInstallation"("id"), "id" TEXT NOT NULL,
 "assignmentId" TEXT, "clientId" TEXT NOT NULL, "occurredAt" TIMESTAMPTZ(3) NOT NULL,
 "observedSubtotal" NUMERIC(20,6) NOT NULL CHECK ("observedSubtotal">=0),
 "currency" CHAR(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
 "matchState" TEXT NOT NULL DEFAULT 'unmatched', "environment" TEXT NOT NULL,
 PRIMARY KEY ("storeId","id"), FOREIGN KEY ("storeId","assignmentId") REFERENCES "Assignment"("storeId","id")
);
CREATE INDEX "Purchase_identity_date_idx" ON "Purchase"("storeId","clientId","occurredAt");
CREATE TABLE "PurchaseAlias" (
 "storeId" TEXT NOT NULL, "kind" TEXT NOT NULL CHECK ("kind" IN ('order','checkout')), "providerId" TEXT NOT NULL, "purchaseId" TEXT NOT NULL,
 PRIMARY KEY ("storeId","kind","providerId"), FOREIGN KEY ("storeId","purchaseId") REFERENCES "Purchase"("storeId","id")
);
CREATE TABLE "Aggregate" (
 "storeId" TEXT NOT NULL, "experimentId" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "variantId" TEXT NOT NULL,
 "currency" CHAR(3) NOT NULL, "cohortDate" DATE NOT NULL, "metrics" JSONB NOT NULL, "rebuiltAt" TIMESTAMPTZ(3) NOT NULL,
 PRIMARY KEY ("storeId","experimentId","revisionId","variantId","currency","cohortDate"),
 FOREIGN KEY ("storeId","experimentId","revisionId","variantId") REFERENCES "Variant"("storeId","experimentId","revisionId","id")
);
CREATE TABLE "Outbox" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id"),
 "kind" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL UNIQUE, "payload" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0,
 "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Outbox_pending_idx" ON "Outbox"("status","availableAt");
CREATE TABLE "AuditRecord" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id"), "actorId" TEXT NOT NULL,
 "action" TEXT NOT NULL, "objectId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION reject_immutable_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable_record' USING ERRCODE='23514'; END $$;
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON "Revision" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER variant_immutable BEFORE UPDATE OR DELETE ON "Variant" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
-- Assignment updates are disallowed; deletion remains available for retention/privacy.
CREATE TRIGGER assignment_immutable BEFORE UPDATE ON "Assignment" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
