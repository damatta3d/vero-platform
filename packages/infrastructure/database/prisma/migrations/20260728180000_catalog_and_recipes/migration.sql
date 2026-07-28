CREATE TYPE "CatalogUnitOfMeasure" AS ENUM (
  'UNIT',
  'GRAM',
  'KILOGRAM',
  'MILLILITER',
  'LITER'
);

CREATE TABLE "catalog_ingredients" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "unit" "CatalogUnitOfMeasure" NOT NULL,
  "packageQuantityMicros" BIGINT NOT NULL,
  "packageCostCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "catalog_ingredients_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "catalog_ingredients_positive_quantity" CHECK ("packageQuantityMicros" > 0),
  CONSTRAINT "catalog_ingredients_non_negative_cost" CHECK ("packageCostCents" >= 0)
);

CREATE TABLE "catalog_products" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "salePriceCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "catalog_products_non_negative_price" CHECK ("salePriceCents" >= 0)
);

CREATE TABLE "catalog_recipes" (
  "id" UUID NOT NULL,
  "tenantId" VARCHAR(128) NOT NULL,
  "productId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "yieldUnits" INTEGER NOT NULL,
  "authoredBy" VARCHAR(256) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "catalog_recipes_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "catalog_recipes_positive_version" CHECK ("version" > 0),
  CONSTRAINT "catalog_recipes_positive_yield" CHECK ("yieldUnits" > 0)
);

CREATE TABLE "catalog_recipe_lines" (
  "tenantId" VARCHAR(128) NOT NULL,
  "recipeId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL,
  "quantityMicros" BIGINT NOT NULL,
  CONSTRAINT "catalog_recipe_lines_pkey" PRIMARY KEY ("tenantId", "recipeId", "ingredientId"),
  CONSTRAINT "catalog_recipe_lines_positive_quantity" CHECK ("quantityMicros" > 0)
);

CREATE INDEX "catalog_ingredients_tenantId_name_idx"
  ON "catalog_ingredients"("tenantId", "name");
CREATE INDEX "catalog_products_tenantId_name_idx"
  ON "catalog_products"("tenantId", "name");
CREATE UNIQUE INDEX "catalog_recipes_tenantId_productId_version_key"
  ON "catalog_recipes"("tenantId", "productId", "version");

ALTER TABLE "catalog_recipes"
  ADD CONSTRAINT "catalog_recipes_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId")
  REFERENCES "catalog_products"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_recipe_lines"
  ADD CONSTRAINT "catalog_recipe_lines_tenantId_recipeId_fkey"
  FOREIGN KEY ("tenantId", "recipeId")
  REFERENCES "catalog_recipes"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catalog_recipe_lines"
  ADD CONSTRAINT "catalog_recipe_lines_tenantId_ingredientId_fkey"
  FOREIGN KEY ("tenantId", "ingredientId")
  REFERENCES "catalog_ingredients"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
