CREATE TYPE "FinancialEntryType" AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE "FinancialEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

CREATE TABLE "financial_entries" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "idempotencyKey" VARCHAR(160) NOT NULL,
  "type" "FinancialEntryType" NOT NULL,
  "description" VARCHAR(256) NOT NULL,
  "category" VARCHAR(120) NOT NULL,
  "counterparty" VARCHAR(256),
  "amountCents" INTEGER NOT NULL,
  "dueAt" TIMESTAMPTZ(3) NOT NULL,
  "paidAt" TIMESTAMPTZ(3),
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'OPEN',
  "sourceType" VARCHAR(64),
  "sourceId" VARCHAR(160),
  "authoredBy" VARCHAR(256) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "financial_entries_amount_positive" CHECK ("amountCents" > 0),
  CONSTRAINT "financial_entries_paid_state" CHECK (
    ("status" = 'PAID' AND "paidAt" IS NOT NULL) OR
    ("status" <> 'PAID' AND "paidAt" IS NULL)
  )
);

CREATE UNIQUE INDEX "financial_entries_tenantId_idempotencyKey_key"
  ON "financial_entries"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "financial_entries_source_key"
  ON "financial_entries"("tenantId", "sourceType", "sourceId")
  WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL;
CREATE INDEX "financial_entries_tenantId_dueAt_idx"
  ON "financial_entries"("tenantId", "dueAt");
CREATE INDEX "financial_entries_tenantId_type_status_dueAt_idx"
  ON "financial_entries"("tenantId", "type", "status", "dueAt");
