import { BadRequestException } from '@nestjs/common';

export type CheckoutPriceLine = {
  menuItemId: string;
  quantity: number;
  unitPriceCents: number;
};

type PricingDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

type PricedMenuItemRow = {
  tenantId: string;
  menuItemId: string;
  name: string;
  priceCents: number;
  available: boolean;
};

export type CouponSnapshot = {
  id: string;
  code: string;
  name: string;
  source: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
};

type CouponRow = CouponSnapshot & {
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  minimumOrderCents: number;
  maxUses: number | null;
  usesCount: number;
};

export type CheckoutPricingRequest = {
  menuSlug: string;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  couponCode?: string;
};

export type CheckoutPricing = {
  tenantId: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    note: string | null;
  }>;
  itemsTotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  coupon: CouponSnapshot | null;
};

export function calculateCheckoutTotal(lines: CheckoutPriceLine[]): number {
  return lines.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0);
}

export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase();
}

export function calculateCouponDiscount(
  itemsTotalCents: number,
  coupon: Pick<CouponSnapshot, 'discountType' | 'discountValue'>
): number {
  const requested =
    coupon.discountType === 'PERCENTAGE'
      ? Math.floor((itemsTotalCents * coupon.discountValue) / 100)
      : coupon.discountValue;
  return Math.min(itemsTotalCents, requested);
}

export async function priceCheckout(
  database: PricingDatabase,
  request: CheckoutPricingRequest,
  options: { lockCoupon?: boolean } = {}
): Promise<CheckoutPricing> {
  if (!request.menuSlug?.trim() || !Array.isArray(request.items) || request.items.length === 0) {
    throw new BadRequestException('Invalid checkout items.');
  }
  if (
    request.items.some(
      (item) =>
        !item.menuItemId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
    ) ||
    new Set(request.items.map((item) => item.menuItemId)).size !== request.items.length
  ) {
    throw new BadRequestException('Invalid checkout items.');
  }

  const ids = request.items.map((item) => item.menuItemId);
  const rows = await database.$queryRawUnsafe<PricedMenuItemRow[]>(
    `SELECT i.tenant_id AS "tenantId", i.id AS "menuItemId",
            COALESCE(i.display_name,p.name) AS name,
            COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents", i.available
       FROM commerce_menu_items i
       JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id
       JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id
      WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`,
    request.menuSlug.trim(),
    ids
  );
  if (rows.length !== ids.length || rows.some((row) => !row.available)) {
    throw new BadRequestException('One or more items are unavailable.');
  }
  const tenantId = rows[0]?.tenantId;
  if (!tenantId || rows.some((row) => row.tenantId !== tenantId)) {
    throw new BadRequestException('Invalid menu tenant.');
  }

  const current = new Map(rows.map((row) => [row.menuItemId, row]));
  const items = request.items.map((line) => {
    const item = current.get(line.menuItemId)!;
    return {
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: line.quantity,
      unitPriceCents: item.priceCents,
      totalCents: item.priceCents * line.quantity,
      note: line.note?.trim() || null
    };
  });
  const itemsTotalCents = calculateCheckoutTotal(items);
  let coupon: CouponSnapshot | null = null;
  let discountCents = 0;
  const code = request.couponCode ? normalizeCouponCode(request.couponCode) : '';
  if (code) {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) {
      throw new BadRequestException({ code: 'INVALID_COUPON', message: 'Cupom inválido.' });
    }
    const couponRows = await database.$queryRawUnsafe<CouponRow[]>(
      `SELECT id, code, name, source, discount_type AS "discountType",
              discount_value AS "discountValue", active, starts_at AS "startsAt",
              expires_at AS "expiresAt", minimum_order_cents AS "minimumOrderCents",
              max_uses AS "maxUses", uses_count AS "usesCount"
         FROM commerce_coupons
        WHERE tenant_id=$1 AND code=$2
        LIMIT 1${options.lockCoupon ? ' FOR UPDATE' : ''}`,
      tenantId,
      code
    );
    const selected = couponRows[0];
    const now = Date.now();
    if (
      !selected ||
      !selected.active ||
      (selected.startsAt && new Date(selected.startsAt).getTime() > now) ||
      (selected.expiresAt && new Date(selected.expiresAt).getTime() <= now) ||
      (selected.maxUses !== null && selected.usesCount >= selected.maxUses)
    ) {
      throw new BadRequestException({
        code: 'INVALID_COUPON',
        message: 'Cupom inválido ou expirado.'
      });
    }
    if (itemsTotalCents < selected.minimumOrderCents) {
      throw new BadRequestException({
        code: 'COUPON_MINIMUM_NOT_REACHED',
        message: 'O pedido mínimo deste cupom não foi atingido.'
      });
    }
    coupon = {
      id: selected.id,
      code: selected.code,
      name: selected.name,
      source: selected.source,
      discountType: selected.discountType,
      discountValue: selected.discountValue
    };
    discountCents = calculateCouponDiscount(itemsTotalCents, coupon);
  }

  return {
    tenantId,
    items,
    itemsTotalCents,
    discountCents,
    deliveryFeeCents: 0,
    totalCents: itemsTotalCents - discountCents,
    coupon
  };
}
