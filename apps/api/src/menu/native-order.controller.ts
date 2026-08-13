import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { kitchenQueue } from './kitchen-queue.service.js';
import type { NativeOrder } from './native-order.types.js';
import type { PaymentMethod, PaymentStatus } from './payment.types.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
type Row = { menuItemId: string; name: string; priceCents: number; available: boolean };
type Request = { menuSlug: string; customer: { name: string; phone: string }; fulfillment: 'DELIVERY' | 'PICKUP'; items: Array<{ menuItemId: string; quantity: number; note?: string }>; payment: { method: PaymentMethod; status: PaymentStatus; paymentId?: string | null } };

@Controller('v1/orders/native')
export class NativeOrderController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Post()
  async create(@Body() request: Request) {
    if (!request.menuSlug?.trim() || !request.customer?.name?.trim() || !request.customer?.phone?.trim() || !request.items?.length) throw new BadRequestException('Invalid native order.');
    if (request.payment.method === 'PIX' && request.payment.status !== 'PAID') throw new BadRequestException('PIX payment must be confirmed before order creation.');
    const ids = request.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(`SELECT i.id AS "menuItemId", COALESCE(i.display_name,p.name) AS name, COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents", i.available FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`, request.menuSlug, ids);
    if (rows.length !== ids.length || rows.some((row) => !row.available)) throw new BadRequestException('One or more items are unavailable.');
    const current = new Map(rows.map((row) => [row.menuItemId, row]));
    const items = request.items.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new BadRequestException('Invalid item quantity.');
      const item = current.get(line.menuItemId)!;
      return { menuItemId: item.menuItemId, name: item.name, quantity: line.quantity, unitPriceCents: item.priceCents, totalCents: item.priceCents * line.quantity, note: line.note?.trim() || null };
    });
    const itemsTotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
    const orderId = randomUUID();
    const order: NativeOrder = { orderId, provider: 'VERO_NATIVE', menuSlug: request.menuSlug, customerName: request.customer.name.trim(), customerPhone: request.customer.phone.trim(), fulfillment: request.fulfillment, items, itemsTotalCents, deliveryFeeCents: 0, totalCents: itemsTotalCents, paymentMethod: request.payment.method, paymentStatus: request.payment.status, providerPaymentId: request.payment.paymentId || null, status: 'RECEIVED', createdAt: new Date().toISOString() };
    return kitchenQueue.save(order);
  }
}
