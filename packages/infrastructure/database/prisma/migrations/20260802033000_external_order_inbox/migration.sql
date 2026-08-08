CREATE TABLE "external_order_inbox" (
  "tenantId" VARCHAR(128) NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "establishmentExternalId" VARCHAR(256) NOT NULL,
  "externalOrderId" VARCHAR(256) NOT NULL,
  "reference" VARCHAR(128) NOT NULL,
  "customerName" VARCHAR(160),
  "orderType" VARCHAR(64) NOT NULL,
  "salesChannel" VARCHAR(128) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL,
  "deliveryFeeCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "mappingStatus" VARCHAR(32) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "observedAt" TIMESTAMPTZ(3) NOT NULL,
  "sourceRevision" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "external_order_inbox_pkey"
    PRIMARY KEY ("tenantId", "provider", "establishmentExternalId", "externalOrderId")
);

CREATE INDEX "external_order_inbox_tenantId_occurredAt_idx"
  ON "external_order_inbox"("tenantId", "occurredAt");

CREATE INDEX "external_order_inbox_tenantId_provider_status_occurredAt_idx"
  ON "external_order_inbox"("tenantId", "provider", "status", "occurredAt");
