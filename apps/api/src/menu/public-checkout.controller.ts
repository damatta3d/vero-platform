import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import type { CheckoutDraft } from './checkout.types.js';
import { validateCheckoutDraft } from './checkout.validation.js';
import { calculateCheckoutTotal } from './checkout-pricing.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
type Row = { menuItemId: string; name: string; priceCents: number; available: boolean };

@Controller('v1/checkout')
export class PublicCheckoutController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Post('validate')
  async validate(@Body() draft: CheckoutDraft) {
    const fields = validateCheckoutDraft(draft);
    if (fields.length) throw new BadRequestException({ message: 'Invalid checkout.', fields });
    const ids = draft.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT i.id AS "menuItemId", COALESCE(i.display_name,p.name) AS name,
       COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents", i.available
       FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id
       JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id
       WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`,
      draft.menuSlug,
      ids
    );
    if (rows.length !== ids.length || rows.some((row) => !row.available))
      throw new BadRequestException('One or more items are unavailable.');
    const current = new Map(rows.map((row) => [row.menuItemId, row]));
    const items = draft.items.map((request) => {
      const item = current.get(request.menuItemId)!;
      return {
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: request.quantity,
        unitPriceCents: item.priceCents,
        totalCents: item.priceCents * request.quantity,
        note: request.note?.trim() || null
      };
    });
    const itemsTotalCents = calculateCheckoutTotal(items);
    return {
      valid: true,
      menuSlug: draft.menuSlug,
      fulfillment: draft.fulfillment,
      customer: draft.customer,
      address: draft.fulfillment === 'DELIVERY' ? draft.address : null,
      orderNote: draft.orderNote?.trim() || null,
      items,
      itemsTotalCents,
      deliveryFeeCents: null,
      amountDueCents: itemsTotalCents
    };
  }
}
