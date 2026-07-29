CREATE TYPE "InventoryStockMovementType" AS ENUM (
  'PURCHASE_IN',
  'CONSUMPTION_OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT'
);

CREATE TABLE "inventory_stock_positions" (
  "tenantId" VARCHAR(128) NOT NULL,
  "ingredientId" UUID NOT NULL,
  "quantityOnHandMicros" BIGINT NOT NULL,
  "averageUnitCostMicros" BIGINT NOT NULL,
  "inventoryValueCents" INTEGER NOT NULL,
  "lastMovementAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_stock_positions_pkey" PRIMARY KEY ("tenantId", "ingredientId"),
  CONSTRAINT "inventory_stock_positions_tenantId_ingredientId_fkey"
    FOREIGN KEY ("tenantId", "ingredientId")
    REFERENCES "catalog_ingredients" ("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_stock_positions_quantity_nonnegative"
    CHECK ("quantityOnHandMicros" >= 0),
  CONSTRAINT "inventory_stock_positions_cost_nonnegative"
    CHECK ("averageUnitCostMicros" >= 0 AND "inventoryValueCents" >= 0)
);

CREATE TABLE "inventory_stock_movements" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "ingredientId" UUID NOT NULL,
  "type" "InventoryStockMovementType" NOT NULL,
  "quantityMicros" BIGINT NOT NULL,
  "unitCostMicros" BIGINT NOT NULL,
  "totalCostCents" INTEGER NOT NULL,
  "reason" VARCHAR(256) NOT NULL,
  "authoredBy" VARCHAR(256) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "inventory_stock_movements_tenantId_ingredientId_fkey"
    FOREIGN KEY ("tenantId", "ingredientId")
    REFERENCES "catalog_ingredients" ("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_stock_movements_quantity_positive" CHECK ("quantityMicros" > 0),
  CONSTRAINT "inventory_stock_movements_cost_nonnegative"
    CHECK ("unitCostMicros" >= 0 AND "totalCostCents" >= 0)
);

CREATE INDEX "inventory_stock_movements_tenantId_ingredientId_occurredAt_idx"
  ON "inventory_stock_movements" ("tenantId", "ingredientId", "occurredAt");

CREATE FUNCTION reject_inventory_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_stock_movements is an immutable ledger';
END;
$$;

CREATE TRIGGER "inventory_stock_movements_immutable"
BEFORE UPDATE OR DELETE ON "inventory_stock_movements"
FOR EACH ROW EXECUTE FUNCTION reject_inventory_ledger_mutation();
