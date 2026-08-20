import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';

import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { loadStoreAvailability } from './store-availability.repository.js';

type PublicMenuDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

type MenuRow = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

type MenuItemRow = {
  categoryId: string;
  categoryName: string;
  categoryDescription: string | null;
  categorySortOrder: number;
  itemId: string | null;
  productId: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  available: boolean | null;
  featured: boolean | null;
  itemSortOrder: number | null;
};

type CheckoutSettingsRow = {
  operationallyOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  minimumOrderCents: number;
  pixEnabled: boolean;
  paymentOnDeliveryEnabled: boolean;
  cashEnabled: boolean;
  cardOnDeliveryEnabled: boolean;
};

@Controller('v1/menu')
export class PublicMenuController {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: PublicMenuDatabase) {}

  @Get(':slug')
  async getPublishedMenu(@Param('slug') slug: string) {
    const menus = await this.database.$queryRawUnsafe<MenuRow[]>(
      `SELECT id, tenant_id AS "tenantId", name, slug, description, logo_url AS "logoUrl", cover_url AS "coverUrl"
       FROM commerce_menus
       WHERE slug = $1 AND published = true
       LIMIT 1`,
      slug
    );

    const menu = menus[0];
    if (!menu) throw new NotFoundException('Cardápio não encontrado.');

    const [rows, settingsRows, availability] = await Promise.all([
      this.database.$queryRawUnsafe<MenuItemRow[]>(
        `SELECT
           c.id AS "categoryId",
           c.name AS "categoryName",
           c.description AS "categoryDescription",
           c.sort_order AS "categorySortOrder",
           i.id AS "itemId",
           p.id AS "productId",
           COALESCE(i.display_name, p.name) AS name,
           i.description,
           i.image_url AS "imageUrl",
           COALESCE(i.sale_price_cents, p."salePriceCents") AS "priceCents",
           i.available,
           i.featured,
           i.sort_order AS "itemSortOrder"
         FROM commerce_menu_categories c
         LEFT JOIN commerce_menu_items i
           ON i.tenant_id = c.tenant_id
          AND i.category_id = c.id
          AND i.menu_id = c.menu_id
          AND i.active = true
          AND i.available = true
         LEFT JOIN catalog_products p
           ON p."tenantId" = i.tenant_id
          AND p.id = i.catalog_product_id
         WHERE c.menu_id = $1::uuid AND c.active = true
         ORDER BY c.sort_order, c.name, i.sort_order, p.name`,
        menu.id
      ),
      this.database.$queryRawUnsafe<CheckoutSettingsRow[]>(
        `SELECT operationally_open AS "operationallyOpen",
                pickup_enabled AS "pickupEnabled",
                delivery_enabled AS "deliveryEnabled",
                minimum_order_cents AS "minimumOrderCents",
                pix_enabled AS "pixEnabled",
                payment_on_delivery_enabled AS "paymentOnDeliveryEnabled",
                cash_on_delivery_enabled AS "cashEnabled",
                card_on_delivery_enabled AS "cardOnDeliveryEnabled"
         FROM store_settings
         WHERE tenant_id = $1
         LIMIT 1`,
        menu.tenantId
      ),
      loadStoreAvailability(this.database, menu.tenantId)
    ]);

    const categories = rows.reduce<
      Array<{
        id: string;
        name: string;
        description: string | null;
        items: Array<{
          id: string;
          productId: string;
          name: string;
          description: string | null;
          imageUrl: string | null;
          priceCents: number;
          available: boolean;
          featured: boolean;
        }>;
      }>
    >((result, row) => {
      let category = result.find((candidate) => candidate.id === row.categoryId);
      if (!category) {
        category = {
          id: row.categoryId,
          name: row.categoryName,
          description: row.categoryDescription,
          items: []
        };
        result.push(category);
      }

      if (row.itemId && row.productId && row.name && row.priceCents !== null) {
        category.items.push({
          id: row.itemId,
          productId: row.productId,
          name: row.name,
          description: row.description,
          imageUrl: row.imageUrl,
          priceCents: row.priceCents,
          available: row.available ?? false,
          featured: row.featured ?? false
        });
      }
      return result;
    }, []);

    const settings = settingsRows[0];
    const checkout = settings
      ? {
          operationallyOpen: settings.operationallyOpen,
          pickupEnabled: settings.pickupEnabled,
          deliveryEnabled: settings.deliveryEnabled,
          minimumOrderCents: settings.minimumOrderCents,
          pixEnabled: settings.pixEnabled,
          paymentOnDeliveryEnabled:
            settings.paymentOnDeliveryEnabled ||
            settings.cashEnabled ||
            settings.cardOnDeliveryEnabled,
          ...availability
        }
      : {
          operationallyOpen: false,
          pickupEnabled: true,
          deliveryEnabled: false,
          minimumOrderCents: 0,
          pixEnabled: false,
          paymentOnDeliveryEnabled: true,
          ...availability
        };

    const { tenantId: _tenantId, ...publicMenu } = menu;
    void _tenantId;
    return {
      ...publicMenu,
      checkout,
      categories: categories.filter((category) => category.items.length > 0)
    };
  }
}
