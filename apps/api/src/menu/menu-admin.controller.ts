import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';

type MenuDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

function tenantId(value: string | undefined): string {
  const tenant = value?.trim();
  if (!tenant) throw new Error('x-tenant-id is required.');
  return tenant;
}

@Controller('v1/commerce/menus')
export class MenuAdminController {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: MenuDatabase) {}

  @Get()
  list(@Headers('x-tenant-id') tenantHeader?: string) {
    return this.database.$queryRawUnsafe(
      `SELECT id, name, slug, description, logo_url AS "logoUrl", cover_url AS "coverUrl", published,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM commerce_menus WHERE tenant_id = $1 ORDER BY name`,
      tenantId(tenantHeader)
    );
  }

  @Post()
  async create(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: { name: string; slug: string; description?: string; logoUrl?: string; coverUrl?: string }
  ) {
    const tenant = tenantId(tenantHeader);
    const id = randomUUID();
    await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menus (id, tenant_id, name, slug, description, logo_url, cover_url, published, created_at, updated_at)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,false,NOW(),NOW())`,
      id,
      tenant,
      body.name.trim(),
      body.slug.trim(),
      body.description ?? null,
      body.logoUrl ?? null,
      body.coverUrl ?? null
    );
    return { id, tenantId: tenant, ...body, published: false };
  }

  @Patch(':menuId')
  async update(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string | null;
      logoUrl?: string | null;
      coverUrl?: string | null;
      published?: boolean;
    }
  ) {
    const tenant = tenantId(tenantHeader);
    await this.database.$executeRawUnsafe(
      `UPDATE commerce_menus SET
        name=COALESCE($3,name), slug=COALESCE($4,slug), description=COALESCE($5,description),
        logo_url=COALESCE($6,logo_url), cover_url=COALESCE($7,cover_url), published=COALESCE($8,published), updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      menuId,
      body.name ?? null,
      body.slug ?? null,
      body.description ?? null,
      body.logoUrl ?? null,
      body.coverUrl ?? null,
      body.published ?? null
    );
    return { id: menuId, updated: true };
  }

  @Post(':menuId/categories')
  async createCategory(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuId: string,
    @Body() body: { name: string; description?: string; sortOrder?: number }
  ) {
    const tenant = tenantId(tenantHeader);
    const id = randomUUID();
    await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,description,sort_order,active,created_at,updated_at)
       VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,true,NOW(),NOW())`,
      id,
      tenant,
      menuId,
      body.name.trim(),
      body.description ?? null,
      body.sortOrder ?? 0
    );
    return { id, menuId, ...body, active: true };
  }

  @Patch(':menuId/categories/:categoryId')
  async updateCategory(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('categoryId') categoryId: string,
    @Body()
    body: { name?: string; description?: string | null; sortOrder?: number; active?: boolean }
  ) {
    const tenant = tenantId(tenantHeader);
    await this.database.$executeRawUnsafe(
      `UPDATE commerce_menu_categories SET name=COALESCE($3,name), description=COALESCE($4,description),
       sort_order=COALESCE($5,sort_order), active=COALESCE($6,active), updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      categoryId,
      body.name ?? null,
      body.description ?? null,
      body.sortOrder ?? null,
      body.active ?? null
    );
    return { id: categoryId, updated: true };
  }

  @Post(':menuId/items')
  async addItem(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuId: string,
    @Body()
    body: {
      categoryId: string;
      catalogProductId: string;
      displayName?: string;
      description?: string;
      imageUrl?: string;
      salePriceCents?: number;
      sortOrder?: number;
      featured?: boolean;
    }
  ) {
    const tenant = tenantId(tenantHeader);
    const id = randomUUID();
    await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_items
       (id,tenant_id,menu_id,category_id,catalog_product_id,display_name,description,image_url,sale_price_cents,sort_order,active,available,featured,created_at,updated_at)
       VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,true,true,$11,NOW(),NOW())`,
      id,
      tenant,
      menuId,
      body.categoryId,
      body.catalogProductId,
      body.displayName ?? null,
      body.description ?? null,
      body.imageUrl ?? null,
      body.salePriceCents ?? null,
      body.sortOrder ?? 0,
      body.featured ?? false
    );
    return { id, menuId, ...body, active: true, available: true };
  }

  @Patch(':menuId/items/:itemId')
  async updateItem(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('itemId') itemId: string,
    @Body()
    body: {
      categoryId?: string;
      displayName?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      salePriceCents?: number | null;
      sortOrder?: number;
      active?: boolean;
      available?: boolean;
      featured?: boolean;
    }
  ) {
    const tenant = tenantId(tenantHeader);
    await this.database.$executeRawUnsafe(
      `UPDATE commerce_menu_items SET category_id=COALESCE($3::uuid,category_id), display_name=COALESCE($4,display_name),
       description=COALESCE($5,description), image_url=COALESCE($6,image_url), sale_price_cents=COALESCE($7,sale_price_cents),
       sort_order=COALESCE($8,sort_order), active=COALESCE($9,active), available=COALESCE($10,available),
       featured=COALESCE($11,featured), updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      itemId,
      body.categoryId ?? null,
      body.displayName ?? null,
      body.description ?? null,
      body.imageUrl ?? null,
      body.salePriceCents ?? null,
      body.sortOrder ?? null,
      body.active ?? null,
      body.available ?? null,
      body.featured ?? null
    );
    return { id: itemId, updated: true };
  }

  @Delete(':menuId/items/:itemId')
  async removeItem(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('itemId') itemId: string
  ) {
    const tenant = tenantId(tenantHeader);
    await this.database.$executeRawUnsafe(
      `DELETE FROM commerce_menu_items WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      itemId
    );
    return { id: itemId, deleted: true };
  }
}
