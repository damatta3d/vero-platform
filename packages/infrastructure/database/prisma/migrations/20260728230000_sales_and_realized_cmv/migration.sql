CREATE TABLE "sales_records" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "productId" UUID NOT NULL,
    "productName" VARCHAR(160) NOT NULL,
    "recipeId" UUID NOT NULL,
    "recipeVersion" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitSalePriceCents" INTEGER NOT NULL,
    "grossRevenueCents" INTEGER NOT NULL,
    "estimatedCmvCents" INTEGER NOT NULL,
    "realizedCmvCents" INTEGER NOT NULL,
    "marginCents" INTEGER NOT NULL,
    "marginBasisPoints" INTEGER NOT NULL,
    "authoredBy" VARCHAR(256) NOT NULL,
    "soldAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_records_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE TABLE "sales_cost_lines" (
    "tenantId" VARCHAR(128) NOT NULL,
    "saleId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "movementId" UUID NOT NULL,
    "quantityMicros" BIGINT NOT NULL,
    "estimatedUnitCostMicros" BIGINT NOT NULL,
    "realizedUnitCostMicros" BIGINT NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "realizedCostCents" INTEGER NOT NULL,

    CONSTRAINT "sales_cost_lines_pkey" PRIMARY KEY ("tenantId", "saleId", "ingredientId")
);

CREATE UNIQUE INDEX "sales_records_tenantId_idempotencyKey_key"
ON "sales_records"("tenantId", "idempotencyKey");

CREATE INDEX "sales_records_tenantId_soldAt_idx"
ON "sales_records"("tenantId", "soldAt");

CREATE UNIQUE INDEX "sales_cost_lines_tenantId_movementId_key"
ON "sales_cost_lines"("tenantId", "movementId");

ALTER TABLE "sales_records"
ADD CONSTRAINT "sales_records_tenantId_productId_fkey"
FOREIGN KEY ("tenantId", "productId")
REFERENCES "catalog_products"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_records"
ADD CONSTRAINT "sales_records_tenantId_recipeId_fkey"
FOREIGN KEY ("tenantId", "recipeId")
REFERENCES "catalog_recipes"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_cost_lines"
ADD CONSTRAINT "sales_cost_lines_tenantId_saleId_fkey"
FOREIGN KEY ("tenantId", "saleId")
REFERENCES "sales_records"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_cost_lines"
ADD CONSTRAINT "sales_cost_lines_tenantId_ingredientId_fkey"
FOREIGN KEY ("tenantId", "ingredientId")
REFERENCES "catalog_ingredients"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_sales_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'sales history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_records_immutable
BEFORE UPDATE OR DELETE ON "sales_records"
FOR EACH ROW EXECUTE FUNCTION reject_sales_history_mutation();

CREATE TRIGGER sales_cost_lines_immutable
BEFORE UPDATE OR DELETE ON "sales_cost_lines"
FOR EACH ROW EXECUTE FUNCTION reject_sales_history_mutation();
