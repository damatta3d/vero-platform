CREATE TABLE "intelligence_channel_order_facts" (
    "tenantId" VARCHAR(128) NOT NULL,
    "connectionId" VARCHAR(128) NOT NULL,
    "orderKey" VARCHAR(256) NOT NULL,
    "revision" TIMESTAMPTZ(3) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "establishmentExternalId" VARCHAR(256) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "salesChannel" VARCHAR(128) NOT NULL,
    "orderType" VARCHAR(128) NOT NULL,
    "menuVersion" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "semanticHash" CHAR(64) NOT NULL,
    "receiptId" VARCHAR(256) NOT NULL,
    "ingestionRunId" VARCHAR(256) NOT NULL,
    "schemaVersion" VARCHAR(64) NOT NULL,
    "persistedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "intelligence_channel_order_facts_pkey"
    PRIMARY KEY ("tenantId", "connectionId", "orderKey", "revision")
);

CREATE TABLE "intelligence_channel_order_line_facts" (
    "tenantId" VARCHAR(128) NOT NULL,
    "connectionId" VARCHAR(128) NOT NULL,
    "orderKey" VARCHAR(256) NOT NULL,
    "revision" TIMESTAMPTZ(3) NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "providerItemId" VARCHAR(256) NOT NULL,
    "parentProviderItemId" VARCHAR(256),
    "name" VARCHAR(512) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "intelligence_channel_order_line_facts_pkey"
    PRIMARY KEY ("tenantId", "connectionId", "orderKey", "revision", "ordinal")
);

CREATE TABLE "intelligence_channel_order_adjustment_facts" (
    "tenantId" VARCHAR(128) NOT NULL,
    "connectionId" VARCHAR(128) NOT NULL,
    "orderKey" VARCHAR(256) NOT NULL,
    "revision" TIMESTAMPTZ(3) NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "label" VARCHAR(256) NOT NULL,

    CONSTRAINT "intelligence_channel_order_adjustment_facts_pkey"
    PRIMARY KEY ("tenantId", "connectionId", "orderKey", "revision", "ordinal")
);

CREATE INDEX "intelligence_channel_order_facts_tenantId_occurredAt_idx"
ON "intelligence_channel_order_facts"("tenantId", "occurredAt");

CREATE INDEX "intelligence_channel_order_facts_scope_occurredAt_idx"
ON "intelligence_channel_order_facts"(
    "tenantId",
    "provider",
    "establishmentExternalId",
    "occurredAt"
);

ALTER TABLE "intelligence_channel_order_line_facts"
ADD CONSTRAINT "intelligence_channel_order_line_facts_order_fkey"
FOREIGN KEY ("tenantId", "connectionId", "orderKey", "revision")
REFERENCES "intelligence_channel_order_facts"(
    "tenantId",
    "connectionId",
    "orderKey",
    "revision"
)
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "intelligence_channel_order_adjustment_facts"
ADD CONSTRAINT "intelligence_channel_order_adjustment_facts_order_fkey"
FOREIGN KEY ("tenantId", "connectionId", "orderKey", "revision")
REFERENCES "intelligence_channel_order_facts"(
    "tenantId",
    "connectionId",
    "orderKey",
    "revision"
)
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE OR REPLACE FUNCTION reject_intelligence_fact_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'intelligence facts are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intelligence_channel_order_facts_immutable
BEFORE UPDATE OR DELETE ON "intelligence_channel_order_facts"
FOR EACH ROW EXECUTE FUNCTION reject_intelligence_fact_mutation();

CREATE TRIGGER intelligence_channel_order_line_facts_immutable
BEFORE UPDATE OR DELETE ON "intelligence_channel_order_line_facts"
FOR EACH ROW EXECUTE FUNCTION reject_intelligence_fact_mutation();

CREATE TRIGGER intelligence_channel_order_adjustment_facts_immutable
BEFORE UPDATE OR DELETE ON "intelligence_channel_order_adjustment_facts"
FOR EACH ROW EXECUTE FUNCTION reject_intelligence_fact_mutation();
