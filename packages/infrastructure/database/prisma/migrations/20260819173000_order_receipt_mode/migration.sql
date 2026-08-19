ALTER TABLE "store_settings"
  ADD COLUMN "order_receipt_mode" VARCHAR(16) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "store_settings"
  ADD CONSTRAINT "store_settings_order_receipt_mode_check"
    CHECK ("order_receipt_mode" IN ('MANUAL', 'AUTOMATIC'));

ALTER TABLE "commerce_native_orders"
  ADD COLUMN "confirmed_source" VARCHAR(16),
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(3),
  ADD CONSTRAINT "commerce_native_orders_confirmed_source_check"
    CHECK ("confirmed_source" IS NULL OR "confirmed_source" IN ('MANUAL', 'AUTO'));
