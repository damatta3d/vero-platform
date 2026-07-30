CREATE TYPE "FinanceAccountGroupType" AS ENUM (
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE'
);

CREATE TABLE "finance_accounts" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "group" "FinanceAccountGroupType" NOT NULL,
  "parentId" UUID,
  "acceptsPosting" BOOLEAN NOT NULL DEFAULT TRUE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "finance_accounts_pkey"
    PRIMARY KEY ("tenantId", "id"),

  CONSTRAINT "finance_accounts_parent_fkey"
    FOREIGN KEY ("tenantId", "parentId")
    REFERENCES "finance_accounts"("tenantId", "id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "finance_accounts_tenantId_code_key"
  ON "finance_accounts"("tenantId", "code");

CREATE INDEX "finance_accounts_tenantId_group_active_idx"
  ON "finance_accounts"("tenantId", "group", "active");

CREATE INDEX "finance_accounts_tenantId_parentId_idx"
  ON "finance_accounts"("tenantId", "parentId");