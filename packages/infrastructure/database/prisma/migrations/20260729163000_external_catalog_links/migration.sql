CREATE TABLE "external_catalog_links" (
    "tenantId" VARCHAR(128) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "establishmentExternalId" VARCHAR(256) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "providerItemId" VARCHAR(256) NOT NULL,
    "catalogProductId" UUID NOT NULL,
    "authoredBy" VARCHAR(256) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_catalog_links_pkey" PRIMARY KEY (
        "tenantId",
        "provider",
        "establishmentExternalId",
        "kind",
        "providerItemId"
    ),
    CONSTRAINT "external_catalog_links_kind_check" CHECK ("kind" IN ('ITEM', 'MODIFIER'))
);

CREATE INDEX "external_catalog_links_tenantId_catalogProductId_idx"
ON "external_catalog_links"("tenantId", "catalogProductId");

ALTER TABLE "external_catalog_links"
ADD CONSTRAINT "external_catalog_links_tenantId_catalogProductId_fkey"
FOREIGN KEY ("tenantId", "catalogProductId")
REFERENCES "catalog_products"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
