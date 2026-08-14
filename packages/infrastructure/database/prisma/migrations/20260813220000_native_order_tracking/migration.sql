ALTER TABLE "commerce_native_orders" ADD COLUMN "tracking_token_hash" VARCHAR(64);
CREATE UNIQUE INDEX "commerce_native_orders_tracking_token_hash_key" ON "commerce_native_orders"("tracking_token_hash") WHERE "tracking_token_hash" IS NOT NULL;
