CREATE TYPE "OperationalEntryType" AS ENUM (
  'INCOME',
  'EXPENSE',
  'PURCHASE',
  'WITHDRAWAL',
  'ADJUSTMENT'
);

CREATE TYPE "OperationalEntryStatus" AS ENUM ('PAID', 'PENDING');

CREATE TYPE "OperationalEntryChannel" AS ENUM (
  'IFOOD',
  'ANOTA_AI',
  'PIX',
  'CASH',
  'OTHER'
);

CREATE TABLE "operational_entries" (
  "id" uuid NOT NULL,
  "tenantId" varchar(128) NOT NULL,
  "type" "OperationalEntryType" NOT NULL,
  "status" "OperationalEntryStatus" NOT NULL,
  "channel" "OperationalEntryChannel",
  "category" varchar(120) NOT NULL,
  "description" varchar(256) NOT NULL,
  "counterparty" varchar(160),
  "paymentMethod" varchar(64),
  "amountCents" integer NOT NULL,
  "orderCount" integer NOT NULL DEFAULT 0,
  "occurredAt" timestamptz(3) NOT NULL,
  "competenceDate" date NOT NULL,
  "notes" varchar(512),
  "createdAt" timestamptz(3) NOT NULL,
  "updatedAt" timestamptz(3) NOT NULL,
  CONSTRAINT "operational_entries_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "operational_entries_amount_positive" CHECK ("amountCents" > 0),
  CONSTRAINT "operational_entries_order_count_non_negative" CHECK ("orderCount" >= 0)
);

CREATE INDEX "operational_entries_tenant_occurred_at_idx"
  ON "operational_entries" ("tenantId", "occurredAt");

CREATE INDEX "operational_entries_tenant_competence_idx"
  ON "operational_entries" ("tenantId", "competenceDate");

CREATE INDEX "operational_entries_tenant_type_status_idx"
  ON "operational_entries" ("tenantId", "type", "status");
