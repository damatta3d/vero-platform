CREATE TABLE "external_order_inbox" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "establishmentExternalId" VARCHAR(256) NOT NULL,
    "externalOrderId" VARCHAR(256) NOT NULL,
    "reference" VARCHAR(128) NOT NULL,
    "customerDisplayName" VARCHAR(80),
    "orderType" VARCHAR(128) NOT NULL,
    "salesChannel" VARCHAR(128) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "deliveryFeeCents" INTEGER NOT NULL,
    "additionalFeesCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "operationalStatus" VARCHAR(32) NOT NULL,
    "providerStatus" VARCHAR(128),
    "mappingStatus" VARCHAR(32) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "lastObservedAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceRevision" VARCHAR(256) NOT NULL,
    "statusUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_order_inbox_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "external_order_inbox_nonnegative_totals" CHECK (
      "subtotalCents" >= 0 AND
      "discountCents" >= 0 AND
      "deliveryFeeCents" >= 0 AND
      "additionalFeesCents" >= 0 AND
      "totalCents" >= 0
    ),
    CONSTRAINT "external_order_inbox_currency_brl" CHECK ("currency" = 'BRL'),
    CONSTRAINT "external_order_inbox_operational_status" CHECK (
      "operationalStatus" IN ('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT "external_order_inbox_mapping_status" CHECK (
      "mappingStatus" IN ('MAPPED', 'REVIEW_REQUIRED')
    )
);

CREATE TABLE "external_order_receipts" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sourceRevision" VARCHAR(256) NOT NULL,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "providerStatus" VARCHAR(128),
    "payloadHash" CHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_order_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_order_inbox_identity_key"
ON "external_order_inbox"("tenantId", "provider", "establishmentExternalId", "externalOrderId");

CREATE INDEX "external_order_inbox_tenant_occurred_id_idx"
ON "external_order_inbox"("tenantId", "occurredAt", "id");

CREATE INDEX "external_order_inbox_provider_status_idx"
ON "external_order_inbox"("tenantId", "provider", "operationalStatus", "occurredAt");

CREATE INDEX "external_order_inbox_mapping_idx"
ON "external_order_inbox"("tenantId", "mappingStatus", "occurredAt");

CREATE UNIQUE INDEX "external_order_receipts_order_revision_key"
ON "external_order_receipts"("orderId", "sourceRevision");

CREATE INDEX "external_order_receipts_order_observed_idx"
ON "external_order_receipts"("orderId", "observedAt");

ALTER TABLE "external_order_receipts"
ADD CONSTRAINT "external_order_receipts_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "external_order_inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
