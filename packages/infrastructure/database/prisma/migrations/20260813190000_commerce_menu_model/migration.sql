CREATE TABLE "commerce_menus" (
  "id" UUID NOT NULL,
  "tenant_id" VARCHAR(128) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "logo_url" VARCHAR(1000),
  "cover_url" VARCHAR(1000),
  "published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_menus_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE UNIQUE INDEX "commerce_menus_slug_key" ON "commerce_menus"("slug");
CREATE INDEX "commerce_menus_tenant_id_name_idx" ON "commerce_menus"("tenant_id", "name");

CREATE TABLE "commerce_menu_categories" (
  "id" UUID NOT NULL,
  "tenant_id" VARCHAR(128) NOT NULL,
  "menu_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_menu_categories_pkey" PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "commerce_menu_categories_menu_fkey" FOREIGN KEY ("tenant_id", "menu_id") REFERENCES "commerce_menus"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "commerce_menu_categories_tenant_id_menu_id_sort_order_idx" ON "commerce_menu_categories"("tenant_id", "menu_id", "sort_order");

CREATE TABLE "commerce_menu_items" (
  "id" UUID NOT NULL,
  "tenant_id" VARCHAR(128) NOT NULL,
  "menu_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "catalog_product_id" UUID NOT NULL,
  "display_name" VARCHAR(160),
  "description" VARCHAR(1000),
  "image_url" VARCHAR(1000),
  "sale_price_cents" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "commerce_menu_items_pkey" PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "commerce_menu_items_menu_fkey" FOREIGN KEY ("tenant_id", "menu_id") REFERENCES "commerce_menus"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commerce_menu_items_category_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "commerce_menu_categories"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commerce_menu_items_catalog_product_fkey" FOREIGN KEY ("tenant_id", "catalog_product_id") REFERENCES "catalog_products"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commerce_menu_items_product_key" ON "commerce_menu_items"("tenant_id", "menu_id", "catalog_product_id");
CREATE INDEX "commerce_menu_items_category_sort_idx" ON "commerce_menu_items"("tenant_id", "category_id", "sort_order");
CREATE INDEX "commerce_menu_items_availability_idx" ON "commerce_menu_items"("tenant_id", "menu_id", "active", "available");
