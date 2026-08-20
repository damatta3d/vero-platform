CREATE TABLE "commerce_coupons" (
  "id" UUID PRIMARY KEY,
  "tenant_id" VARCHAR(128) NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "source" VARCHAR(160),
  "discount_type" VARCHAR(32) NOT NULL,
  "discount_value" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "starts_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3),
  "minimum_order_cents" INTEGER NOT NULL DEFAULT 0,
  "max_uses" INTEGER,
  "uses_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "commerce_coupons_discount_type_check"
    CHECK ("discount_type" IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  CONSTRAINT "commerce_coupons_discount_value_check"
    CHECK (
      ("discount_type" = 'PERCENTAGE' AND "discount_value" BETWEEN 1 AND 100)
      OR ("discount_type" = 'FIXED_AMOUNT' AND "discount_value" > 0)
    ),
  CONSTRAINT "commerce_coupons_minimum_order_check" CHECK ("minimum_order_cents" >= 0),
  CONSTRAINT "commerce_coupons_max_uses_check" CHECK ("max_uses" IS NULL OR "max_uses" > 0),
  CONSTRAINT "commerce_coupons_uses_count_check" CHECK ("uses_count" >= 0),
  CONSTRAINT "commerce_coupons_validity_check"
    CHECK ("starts_at" IS NULL OR "expires_at" IS NULL OR "starts_at" < "expires_at")
);

CREATE UNIQUE INDEX "commerce_coupons_tenant_code_key"
  ON "commerce_coupons"("tenant_id", "code");
CREATE INDEX "commerce_coupons_tenant_active_idx"
  ON "commerce_coupons"("tenant_id", "active", "updated_at");

ALTER TABLE "commerce_native_orders"
  ADD COLUMN "discount_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "coupon_id" UUID,
  ADD COLUMN "coupon_code" VARCHAR(64),
  ADD COLUMN "coupon_name" VARCHAR(160),
  ADD COLUMN "coupon_source" VARCHAR(160),
  ADD COLUMN "coupon_discount_type" VARCHAR(32),
  ADD COLUMN "coupon_discount_value" INTEGER;

ALTER TABLE "commerce_native_orders"
  ADD CONSTRAINT "commerce_native_orders_discount_check"
    CHECK ("discount_cents" >= 0 AND "discount_cents" <= "items_total_cents"),
  ADD CONSTRAINT "commerce_native_orders_coupon_snapshot_check"
    CHECK (
      ("coupon_id" IS NULL AND "coupon_code" IS NULL AND "coupon_discount_type" IS NULL
        AND "coupon_discount_value" IS NULL AND "discount_cents" = 0)
      OR
      ("coupon_id" IS NOT NULL AND "coupon_code" IS NOT NULL
        AND "coupon_discount_type" IN ('PERCENTAGE', 'FIXED_AMOUNT')
        AND "coupon_discount_value" > 0)
    ),
  ADD CONSTRAINT "commerce_native_orders_coupon_id_fkey"
    FOREIGN KEY ("coupon_id") REFERENCES "commerce_coupons"("id") ON DELETE RESTRICT;
