CREATE TABLE "production_records" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "productId" UUID NOT NULL,
    "productName" VARCHAR(160) NOT NULL,
    "recipeId" UUID NOT NULL,
    "recipeVersion" INTEGER NOT NULL,
    "yieldUnits" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedCmvCents" INTEGER NOT NULL,
    "realizedCmvCents" INTEGER NOT NULL,
    "authoredBy" VARCHAR(256) NOT NULL,
    "producedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "production_records_pkey" PRIMARY KEY ("tenantId", "id"),
    CONSTRAINT "production_records_positive_values"
      CHECK ("recipeVersion" > 0 AND "yieldUnits" > 0 AND "quantity" > 0),
    CONSTRAINT "production_records_nonnegative_costs"
      CHECK ("estimatedCmvCents" >= 0 AND "realizedCmvCents" >= 0)
);

CREATE TABLE "production_cost_lines" (
    "tenantId" VARCHAR(128) NOT NULL,
    "productionId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "movementId" UUID NOT NULL,
    "quantityMicros" BIGINT NOT NULL,
    "estimatedUnitCostMicros" BIGINT NOT NULL,
    "realizedUnitCostMicros" BIGINT NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "realizedCostCents" INTEGER NOT NULL,

    CONSTRAINT "production_cost_lines_pkey"
      PRIMARY KEY ("tenantId", "productionId", "ingredientId"),
    CONSTRAINT "production_cost_lines_positive_quantity" CHECK ("quantityMicros" > 0),
    CONSTRAINT "production_cost_lines_nonnegative_costs"
      CHECK (
        "estimatedUnitCostMicros" >= 0
        AND "realizedUnitCostMicros" >= 0
        AND "estimatedCostCents" >= 0
        AND "realizedCostCents" >= 0
      )
);

CREATE UNIQUE INDEX "production_records_tenantId_idempotencyKey_key"
ON "production_records"("tenantId", "idempotencyKey");

CREATE INDEX "production_records_tenantId_producedAt_idx"
ON "production_records"("tenantId", "producedAt");

CREATE UNIQUE INDEX "production_cost_lines_tenantId_movementId_key"
ON "production_cost_lines"("tenantId", "movementId");

ALTER TABLE "production_records"
ADD CONSTRAINT "production_records_tenantId_productId_fkey"
FOREIGN KEY ("tenantId", "productId")
REFERENCES "catalog_products"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_records"
ADD CONSTRAINT "production_records_tenantId_recipeId_fkey"
FOREIGN KEY ("tenantId", "recipeId")
REFERENCES "catalog_recipes"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_cost_lines"
ADD CONSTRAINT "production_cost_lines_tenantId_productionId_fkey"
FOREIGN KEY ("tenantId", "productionId")
REFERENCES "production_records"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_cost_lines"
ADD CONSTRAINT "production_cost_lines_tenantId_ingredientId_fkey"
FOREIGN KEY ("tenantId", "ingredientId")
REFERENCES "catalog_ingredients"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_cost_lines"
ADD CONSTRAINT "production_cost_lines_tenantId_movementId_fkey"
FOREIGN KEY ("tenantId", "movementId")
REFERENCES "inventory_stock_movements"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_production_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'production history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER production_records_immutable
BEFORE UPDATE OR DELETE ON "production_records"
FOR EACH ROW EXECUTE FUNCTION reject_production_history_mutation();

CREATE TRIGGER production_cost_lines_immutable
BEFORE UPDATE OR DELETE ON "production_cost_lines"
FOR EACH ROW EXECUTE FUNCTION reject_production_history_mutation();
