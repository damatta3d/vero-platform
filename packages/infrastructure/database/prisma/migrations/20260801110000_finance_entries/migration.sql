CREATE TYPE "FinanceEntryType" AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE "FinanceEntryStatus" AS ENUM ('OPEN', 'SETTLED', 'CANCELLED');

CREATE TABLE "finance_entries" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "type" "FinanceEntryType" NOT NULL,
  "description" VARCHAR(256) NOT NULL,
  "category" VARCHAR(120) NOT NULL,
  "amountInCents" INTEGER NOT NULL,
  "dueDate" TIMESTAMPTZ(3) NOT NULL,
  "status" "FinanceEntryStatus" NOT NULL DEFAULT 'OPEN',
  "counterparty" VARCHAR(160),
  "sourceKey" VARCHAR(160),
  "settledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "finance_entries_amount_positive" CHECK ("amountInCents" > 0)
);

CREATE UNIQUE INDEX "finance_entries_tenant_source_key_key"
  ON "finance_entries" ("tenantId", "sourceKey")
  WHERE "sourceKey" IS NOT NULL;

CREATE INDEX "finance_entries_tenant_due_date_idx"
  ON "finance_entries" ("tenantId", "dueDate");

CREATE INDEX "finance_entries_tenant_status_type_idx"
  ON "finance_entries" ("tenantId", "status", "type");
