BEGIN;

CREATE SEQUENCE "commerce_order_operational_number_seq"
  AS INTEGER
  MINVALUE 1
  MAXVALUE 99999
  NO CYCLE;

ALTER TABLE "commerce_native_orders"
  ADD COLUMN "operational_number" INTEGER,
  ADD COLUMN "order_note" VARCHAR(2000),
  ADD COLUMN "delivery_address" JSONB;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "commerce_native_orders") > 99999 THEN
    RAISE EXCEPTION 'Cannot assign five-digit operational numbers to more than 99999 orders';
  END IF;
END $$;

WITH "numbered_orders" AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at", "id")::INTEGER AS "number"
  FROM "commerce_native_orders"
)
UPDATE "commerce_native_orders" AS "orders"
SET "operational_number" = "numbered_orders"."number"
FROM "numbered_orders"
WHERE "orders"."id" = "numbered_orders"."id";

DO $$
DECLARE
  "last_number" INTEGER;
BEGIN
  SELECT COALESCE(MAX("operational_number"), 0)
  INTO "last_number"
  FROM "commerce_native_orders";

  IF "last_number" = 0 THEN
    PERFORM setval('commerce_order_operational_number_seq', 1, false);
  ELSE
    PERFORM setval('commerce_order_operational_number_seq', "last_number", true);
  END IF;
END $$;

ALTER TABLE "commerce_native_orders"
  ALTER COLUMN "operational_number" SET DEFAULT nextval('commerce_order_operational_number_seq'),
  ALTER COLUMN "operational_number" SET NOT NULL;

ALTER SEQUENCE "commerce_order_operational_number_seq"
  OWNED BY "commerce_native_orders"."operational_number";

ALTER TABLE "commerce_native_orders"
  ADD CONSTRAINT "commerce_native_orders_operational_number_check"
    CHECK ("operational_number" BETWEEN 1 AND 99999);

CREATE UNIQUE INDEX "commerce_native_orders_operational_number_key"
  ON "commerce_native_orders"("operational_number");

ALTER TABLE "store_settings"
  ADD COLUMN "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Campo_Grande';

ALTER TABLE "store_settings"
  ADD CONSTRAINT "store_settings_timezone_not_blank"
    CHECK (LENGTH(TRIM("timezone")) > 0);

COMMIT;
