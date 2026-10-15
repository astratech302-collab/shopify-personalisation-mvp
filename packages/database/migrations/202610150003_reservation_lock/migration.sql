-- Lock the reservation through the state transition so concurrent deletion cannot
-- leave an enrolling experiment without its unique store reservation.
CREATE OR REPLACE FUNCTION require_store_reservation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status" IN ('publishing','running') THEN
  PERFORM 1 FROM "StoreReservation" r WHERE r."storeId"=NEW."storeId" AND r."experimentId"=NEW."id" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'store_reservation_required' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
