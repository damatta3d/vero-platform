import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

type MenuDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

const idSchema = z.string().uuid();
const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().url().max(2048).optional(),
  coverUrl: z.string().url().max(2048).optional()
});
const updateMenuSchema = createMenuSchema.partial().extend({
  description: z.string().trim().max(1000).nullable().optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
  coverUrl: z.string().url().max(2048).nullable().optional(),
  published: z.boolean().optional()
});
const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional()
});
const updateCategorySchema = createCategorySchema.partial().extend({
  description: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional()
});
const createItemSchema = z.object({
  categoryId: idSchema,
  catalogProductId: idSchema,
  displayName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  salePriceCents: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  featured: z.boolean().optional()
});
const updateItemSchema = z.object({
  categoryId: idSchema.optional(),
  displayName: z.string().trim().min(1).max(160).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  salePriceCents: z.number().int().nonnegative().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  active: z.boolean().optional(),
  available: z.boolean().optional(),
  featured: z.boolean().optional()
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: 'INVALID_REQUEST',
      fields: result.error.issues.map((issue) => issue.path.join('.'))
    });
  }
  return result.data;
}
function tenantId(value: string | undefined): string {
  const tenant = value?.trim();
  if (!tenant) throw new BadRequestException({ code: 'TENANT_REQUIRED' });
  return tenant;
}
function uuid(value: string): string {
  return parse(idSchema, value);
}
function ensureChanged(count: number, resource: string): void {
  if (count === 0) throw new NotFoundException({ code: 'NOT_FOUND', resource });
}

@Controller('v1/commerce/menus')
export class MenuAdminController {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: MenuDatabase,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}
  private async authorize(authorization: string | undefined, tenantHeader: string | undefined) {
    const tenant = tenantId(tenantHeader);
    await this.security.authorize(authorization, tenant, 'catalog.menu.manage');
    return tenant;
  }

  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantHeader?: string
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    return this.database.$queryRawUnsafe(
      `SELECT id, name, slug, description, logo_url AS "logoUrl", cover_url AS "coverUrl", published, created_at AS "createdAt", updated_at AS "updatedAt" FROM commerce_menus WHERE tenant_id = $1 ORDER BY name`,
      tenant
    );
  }

  @Get(':menuId')
  async detail(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const menus = await this.database.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, name, slug, description, logo_url AS "logoUrl", cover_url AS "coverUrl", published, created_at AS "createdAt", updated_at AS "updatedAt" FROM commerce_menus WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      menuId
    );
    if (!menus.length) throw new NotFoundException({ code: 'NOT_FOUND', resource: 'menu' });
    const categories = await this.database.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, name, description, sort_order AS "sortOrder", active FROM commerce_menu_categories WHERE tenant_id=$1 AND menu_id=$2::uuid ORDER BY sort_order, name`,
      tenant,
      menuId
    );
    const items = await this.database.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT mi.id, mi.category_id AS "categoryId", mi.catalog_product_id AS "catalogProductId", COALESCE(mi.display_name,p.name) AS name, mi.display_name AS "displayName", mi.description, mi.image_url AS "imageUrl", COALESCE(mi.sale_price_cents,p."salePriceCents") AS "priceCents", mi.sale_price_cents AS "salePriceCents", mi.sort_order AS "sortOrder", mi.active, mi.available, mi.featured FROM commerce_menu_items mi JOIN catalog_products p ON p.id=mi.catalog_product_id AND p."tenantId"=mi.tenant_id WHERE mi.tenant_id=$1 AND mi.menu_id=$2::uuid ORDER BY mi.sort_order, name`,
      tenant,
      menuId
    );
    return { menu: menus[0], categories, items };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const body = parse(createMenuSchema, rawBody);
    const id = randomUUID();
    await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menus (id, tenant_id, name, slug, description, logo_url, cover_url, published, created_at, updated_at) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,false,NOW(),NOW())`,
      id,
      tenant,
      body.name,
      body.slug,
      body.description ?? null,
      body.logoUrl ?? null,
      body.coverUrl ?? null
    );
    return { id, tenantId: tenant, ...body, published: false };
  }

  @Patch(':menuId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const body = parse(updateMenuSchema, rawBody);
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE commerce_menus SET name=COALESCE($3,name), slug=COALESCE($4,slug), description=CASE WHEN $9 THEN $5 ELSE description END, logo_url=CASE WHEN $10 THEN $6 ELSE logo_url END, cover_url=CASE WHEN $11 THEN $7 ELSE cover_url END, published=COALESCE($8,published), updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
      tenant,
      menuId,
      body.name ?? null,
      body.slug ?? null,
      body.description ?? null,
      body.logoUrl ?? null,
      body.coverUrl ?? null,
      body.published ?? null,
      Object.hasOwn(body, 'description'),
      Object.hasOwn(body, 'logoUrl'),
      Object.hasOwn(body, 'coverUrl')
    );
    ensureChanged(changed, 'menu');
    return { id: menuId, updated: true };
  }

  @Post(':menuId/categories')
  async createCategory(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const body = parse(createCategorySchema, rawBody);
    const id = randomUUID();
    const changed = await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,description,sort_order,active,created_at,updated_at) SELECT $1::uuid,$2::varchar(128),$3::uuid,$4::varchar(160),$5::varchar(500),$6::integer,true,NOW(),NOW() FROM commerce_menus WHERE tenant_id=$2::varchar(128) AND id=$3::uuid`,
      id,
      tenant,
      menuId,
      body.name,
      body.description ?? null,
      body.sortOrder ?? 0
    );
    ensureChanged(changed, 'menu');
    return { id, menuId, ...body, active: true };
  }

  @Patch(':menuId/categories/:categoryId')
  async updateCategory(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Param('categoryId') categoryIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const categoryId = uuid(categoryIdRaw);
    const body = parse(updateCategorySchema, rawBody);
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE commerce_menu_categories SET name=COALESCE($4,name), description=CASE WHEN $8 THEN $5 ELSE description END, sort_order=COALESCE($6,sort_order), active=COALESCE($7,active), updated_at=NOW() WHERE tenant_id=$1 AND menu_id=$2::uuid AND id=$3::uuid`,
      tenant,
      menuId,
      categoryId,
      body.name ?? null,
      body.description ?? null,
      body.sortOrder ?? null,
      body.active ?? null,
      Object.hasOwn(body, 'description')
    );
    ensureChanged(changed, 'category');
    return { id: categoryId, updated: true };
  }

  @Post(':menuId/items')
  async addItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const body = parse(createItemSchema, rawBody);
    const id = randomUUID();
    const changed = await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,display_name,description,image_url,sale_price_cents,sort_order,active,available,featured,created_at,updated_at) SELECT $1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,true,true,$11,NOW(),NOW() FROM commerce_menu_categories c JOIN catalog_products p ON p.id=$5::uuid AND p."tenantId"=$2 WHERE c.id=$4::uuid AND c.menu_id=$3::uuid AND c.tenant_id=$2`,
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
    ensureChanged(changed, 'category_or_product');
    return { id, menuId, ...body, active: true, available: true };
  }

  @Patch(':menuId/items/:itemId')
  async updateItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Param('itemId') itemIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const itemId = uuid(itemIdRaw);
    const body = parse(updateItemSchema, rawBody);
    if (body.categoryId) {
      const categories = await this.database.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM commerce_menu_categories WHERE tenant_id=$1 AND menu_id=$2::uuid AND id=$3::uuid`,
        tenant,
        menuId,
        body.categoryId
      );
      if (!categories.length)
        throw new NotFoundException({ code: 'NOT_FOUND', resource: 'category' });
    }
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE commerce_menu_items SET category_id=COALESCE($4::uuid,category_id), display_name=CASE WHEN $12 THEN $5 ELSE display_name END, description=CASE WHEN $13 THEN $6 ELSE description END, image_url=CASE WHEN $14 THEN $7 ELSE image_url END, sale_price_cents=CASE WHEN $15 THEN $8 ELSE sale_price_cents END, sort_order=COALESCE($9,sort_order), active=COALESCE($10,active), available=COALESCE($11,available), featured=COALESCE($16,featured), updated_at=NOW() WHERE tenant_id=$1 AND menu_id=$2::uuid AND id=$3::uuid`,
      tenant,
      menuId,
      itemId,
      body.categoryId ?? null,
      body.displayName ?? null,
      body.description ?? null,
      body.imageUrl ?? null,
      body.salePriceCents ?? null,
      body.sortOrder ?? null,
      body.active ?? null,
      body.available ?? null,
      Object.hasOwn(body, 'displayName'),
      Object.hasOwn(body, 'description'),
      Object.hasOwn(body, 'imageUrl'),
      Object.hasOwn(body, 'salePriceCents'),
      body.featured ?? null
    );
    ensureChanged(changed, 'item');
    return { id: itemId, updated: true };
  }

  @Delete(':menuId/items/:itemId')
  async removeItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('menuId') menuIdRaw: string,
    @Param('itemId') itemIdRaw: string
  ) {
    const tenant = await this.authorize(authorization, tenantHeader);
    const menuId = uuid(menuIdRaw);
    const itemId = uuid(itemIdRaw);
    const changed = await this.database.$executeRawUnsafe(
      `DELETE FROM commerce_menu_items WHERE tenant_id=$1 AND menu_id=$2::uuid AND id=$3::uuid`,
      tenant,
      menuId,
      itemId
    );
    ensureChanged(changed, 'item');
    return { id: itemId, deleted: true };
  }
}