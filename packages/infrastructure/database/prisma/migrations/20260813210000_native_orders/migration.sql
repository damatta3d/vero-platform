CREATE TABLE "commerce_native_orders" (
  "id" UUID PRIMARY KEY,
  "tenant_id" VARCHAR(128) NOT NULL,
  "menu_slug" VARCHAR(160) NOT NULL,
  "provider" VARCHAR(32) NOT NULL DEFAULT 'VERO_NATIVE',
  "customer_name" VARCHAR(160) NOT NULL,
  "customer_phone" VARCHAR(64) NOT NULL,
  "fulfillment" VARCHAR(16) NOT NULL,
  "items_total_cents" INTEGER NOT NULL,
  "delivery_fee_cents" INTEGER NOT NULL DEFAULT 0,
  "total_cents" INTEGER NOT NULL,
  "payment_method" VARCHAR(32) NOT NULL,
  "payment_status" VARCHAR(32) NOT NULL,
  "provider_payment_id" VARCHAR(256),
  "status" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "commerce_native_orders_tenant_status_created_idx" ON "commerce_native_orders"("tenant_id", "status", "created_at");
CREATE UNIQUE INDEX "commerce_native_orders_provider_payment_key" ON "commerce_native_orders"("tenant_id", "provider_payment_id") WHERE "provider_payment_id" IS NOT NULL;

CREATE TABLE "commerce_native_order_items" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "commerce_native_orders"("id") ON DELETE CASCADE,
  "menu_item_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_cents" INTEGER NOT NULL,
  "total_cents" INTEGER NOT NULL,
  "note" VARCHAR(1000)
);
CREATE INDEX "commerce_native_order_items_order_idx" ON "commerce_native_order_items"("order_id");

CREATE TABLE "commerce_native_order_status_history" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "commerce_native_orders"("id") ON DELETE CASCADE,
  "from_status" VARCHAR(32),
  "to_status" VARCHAR(32) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "commerce_native_order_status_history_order_idx" ON "commerce_native_order_status_history"("order_id", "occurred_at");
