BEGIN;

CREATE TABLE "commerce_payment_attempts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" VARCHAR(128) NOT NULL,
  "checkout_key_hash" VARCHAR(64) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "order_id" UUID,
  "provider" VARCHAR(32) NOT NULL,
  "provider_order_id" VARCHAR(160),
  "provider_payment_id" VARCHAR(160),
  "external_reference" VARCHAR(64) NOT NULL,
  "method" VARCHAR(32) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "status" VARCHAR(32) NOT NULL,
  "provider_status" VARCHAR(64),
  "provider_status_detail" VARCHAR(128),
  "pix_copy_paste" TEXT,
  "qr_code_base64" TEXT,
  "pix_ticket_url" TEXT,
  "expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "commerce_payment_attempts_checkout_hash_check"
    CHECK ("checkout_key_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "commerce_payment_attempts_request_hash_check"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "commerce_payment_attempts_provider_check"
    CHECK ("provider" IN ('MERCADO_PAGO', 'VERO')),
  CONSTRAINT "commerce_payment_attempts_method_check"
    CHECK ("method" IN ('PIX', 'PAY_ON_DELIVERY')),
  CONSTRAINT "commerce_payment_attempts_provider_method_check"
    CHECK (
      ("provider" = 'MERCADO_PAGO' AND "method" = 'PIX') OR
      ("provider" = 'VERO' AND "method" = 'PAY_ON_DELIVERY')
    ),
  CONSTRAINT "commerce_payment_attempts_amount_check"
    CHECK ("amount_cents" > 0 AND "amount_cents" <= 100000000),
  CONSTRAINT "commerce_payment_attempts_currency_check"
    CHECK ("currency" = 'BRL'),
  CONSTRAINT "commerce_payment_attempts_status_check"
    CHECK (
      "status" IN (
        'PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED',
        'REFUNDED', 'CHARGED_BACK'
      )
    ),
  CONSTRAINT "commerce_payment_attempts_order_fkey"
    FOREIGN KEY ("order_id") REFERENCES "commerce_native_orders"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "commerce_payment_attempts_tenant_checkout_key"
  ON "commerce_payment_attempts"("tenant_id", "checkout_key_hash");
CREATE UNIQUE INDEX "commerce_payment_attempts_order_key"
  ON "commerce_payment_attempts"("order_id") WHERE "order_id" IS NOT NULL;
CREATE UNIQUE INDEX "commerce_payment_attempts_provider_order_key"
  ON "commerce_payment_attempts"("provider", "provider_order_id")
  WHERE "provider_order_id" IS NOT NULL;
CREATE UNIQUE INDEX "commerce_payment_attempts_provider_payment_key"
  ON "commerce_payment_attempts"("provider", "provider_payment_id")
  WHERE "provider_payment_id" IS NOT NULL;
CREATE INDEX "commerce_payment_attempts_tenant_status_updated_idx"
  ON "commerce_payment_attempts"("tenant_id", "status", "updated_at");

CREATE TABLE "commerce_payment_status_history" (
  "id" UUID PRIMARY KEY,
  "payment_id" UUID NOT NULL
    REFERENCES "commerce_payment_attempts"("id") ON DELETE CASCADE,
  "from_status" VARCHAR(32),
  "to_status" VARCHAR(32) NOT NULL,
  "provider_status" VARCHAR(64),
  "provider_status_detail" VARCHAR(128),
  "source" VARCHAR(32) NOT NULL,
  "request_id" VARCHAR(160),
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "commerce_payment_status_history_source_check"
    CHECK ("source" IN ('CREATED', 'PROVIDER_CREATE', 'WEBHOOK', 'MANAGER'))
);

CREATE INDEX "commerce_payment_status_history_payment_idx"
  ON "commerce_payment_status_history"("payment_id", "occurred_at");
CREATE UNIQUE INDEX "commerce_payment_status_history_request_key"
  ON "commerce_payment_status_history"("payment_id", "request_id")
  WHERE "request_id" IS NOT NULL;

CREATE TABLE "commerce_payment_webhook_inbox" (
  "provider_order_id" VARCHAR(160) PRIMARY KEY,
  "provider_payment_id" VARCHAR(160) NOT NULL,
  "external_reference" VARCHAR(64) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "provider_status" VARCHAR(64) NOT NULL,
  "provider_status_detail" VARCHAR(128),
  "request_id" VARCHAR(160) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMPTZ(3),
  CONSTRAINT "commerce_payment_webhook_inbox_amount_check"
    CHECK ("amount_cents" > 0 AND "amount_cents" <= 100000000),
  CONSTRAINT "commerce_payment_webhook_inbox_status_check"
    CHECK (
      "status" IN (
        'PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED',
        'REFUNDED', 'CHARGED_BACK'
      )
    )
);

CREATE INDEX "commerce_payment_webhook_inbox_pending_idx"
  ON "commerce_payment_webhook_inbox"("received_at") WHERE "processed_at" IS NULL;

ALTER TABLE "commerce_native_orders"
  ADD COLUMN "payment_id" UUID,
  ADD CONSTRAINT "commerce_native_orders_payment_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "commerce_payment_attempts"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "commerce_native_orders_payment_status_check"
    CHECK (
      "payment_status" IN (
        'PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED',
        'REFUNDED', 'CHARGED_BACK'
      )
    );

CREATE UNIQUE INDEX "commerce_native_orders_payment_key"
  ON "commerce_native_orders"("payment_id") WHERE "payment_id" IS NOT NULL;

COMMIT;
