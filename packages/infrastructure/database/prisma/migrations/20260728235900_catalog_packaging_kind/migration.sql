CREATE TYPE "CatalogItemKind" AS ENUM ('INGREDIENT', 'PACKAGING');

ALTER TABLE "catalog_ingredients"
ADD COLUMN "kind" "CatalogItemKind" NOT NULL DEFAULT 'INGREDIENT';

CREATE INDEX "catalog_ingredients_tenantId_kind_name_idx"
ON "catalog_ingredients"("tenantId", "kind", "name");
