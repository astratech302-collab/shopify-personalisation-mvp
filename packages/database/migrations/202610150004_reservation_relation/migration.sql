-- Explicit compound uniqueness is required by Prisma's one-to-one relation.
ALTER TABLE "StoreReservation" ADD CONSTRAINT "StoreReservation_storeId_experimentId_key" UNIQUE ("storeId","experimentId");
