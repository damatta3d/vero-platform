ALTER TABLE "store_settings"
  ADD COLUMN IF NOT EXISTS "order_receipt_mode" VARCHAR(16);

UPDATE "store_settings"
SET "order_receipt_mode" = 'MANUAL'
WHERE "order_receipt_mode" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "store_settings"
    WHERE "order_receipt_mode" NOT IN ('MANUAL', 'AUTOMATIC')
  ) THEN
    RAISE EXCEPTION 'store_settings.order_receipt_mode contains unsupported values';
  END IF;
END $$;

ALTER TABLE "store_settings"
  ALTER COLUMN "order_receipt_mode" TYPE VARCHAR(16)
    USING "order_receipt_mode"::text,
  ALTER COLUMN "order_receipt_mode" SET DEFAULT 'MANUAL',
  ALTER COLUMN "order_receipt_mode" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "store_settings_order_receipt_mode_check",
  ADD CONSTRAINT "store_settings_order_receipt_mode_check"
    CHECK ("order_receipt_mode" IN ('MANUAL', 'AUTOMATIC'));

ALTER TABLE "commerce_native_orders"
  ADD COLUMN IF NOT EXISTS "confirmed_source" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "commerce_native_orders"
    WHERE "confirmed_source" IS NOT NULL
      AND "confirmed_source" NOT IN ('MANUAL', 'AUTO')
  ) THEN
    RAISE EXCEPTION 'commerce_native_orders.confirmed_source contains unsupported values';
  END IF;
END $$;

ALTER TABLE "commerce_native_orders"
  ALTER COLUMN "confirmed_source" TYPE VARCHAR(16)
    USING "confirmed_source"::text,
  DROP CONSTRAINT IF EXISTS "commerce_native_orders_confirmed_source_check",
  ADD CONSTRAINT "commerce_native_orders_confirmed_source_check"
    CHECK ("confirmed_source" IS NULL OR "confirmed_source" IN ('MANUAL', 'AUTO'));
