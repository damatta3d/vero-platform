ALTER TABLE "commerce_native_orders"
  ADD COLUMN "idempotency_key_hash" VARCHAR(64);

CREATE UNIQUE INDEX "commerce_native_orders_tenant_idempotency_key"
  ON "commerce_native_orders"("tenant_id", "idempotency_key_hash")
  WHERE "idempotency_key_hash" IS NOT NULL;
