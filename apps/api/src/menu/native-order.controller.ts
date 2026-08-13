import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import type { PaymentMethod, PaymentStatus } from './payment.types.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>; $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> };
type Row = { tenantId: string; menuItemId: string; name: string; priceCents: number; available: boolean };
type Request = { menuSlug: string; customer: { name: string; phone: string }; fulfillment: 'DELIVERY' | 'PICKUP'; items: Array<{ menuItemId: string; quantity: number; note?: string }>; payment: { method: PaymentMethod; status: PaymentStatus; paymentId?: string | null } };

@Controller('v1/orders/native')
export class NativeOrderController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}
  @Post()
  async create(@Body() request: Request) {
    if (!request.menuSlug?.trim() || !request.customer?.name?.trim() || !request.customer?.phone?.trim() || !request.items?.length) throw new BadRequestException('Invalid native order.');
    if (request.payment.method === 'PIX' && !request.payment.paymentId?.trim()) throw new BadRequestException('PIX payment id is required.');
    if (request.payment.method === 'PAY_ON_DELIVERY' && request.payment.status !== 'PENDING') throw new BadRequestException('Invalid pay-on-delivery status.');
    const ids = request.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(`SELECT i.tenant_id AS "tenantId",i.id AS "menuItemId",COALESCE(i.display_name,p.name) AS name,COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents",i.available FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`, request.menuSlug, ids);
    if (rows.length !== ids.length || rows.some((row) => !row.available)) throw new BadRequestException('One or more items are unavailable.');
    const tenantId = rows[0]?.tenantId;
    if (!tenantId || rows.some((row) => row.tenantId !== tenantId)) throw new BadRequestException('Invalid menu tenant.');
    const current = new Map(rows.map((row) => [row.menuItemId, row]));
    const items = request.items.map((line) => { if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new BadRequestException('Invalid item quantity.'); const item = current.get(line.menuItemId)!; return { menuItemId: item.menuItemId, name: item.name, quantity: line.quantity, unitPriceCents: item.priceCents, totalCents: item.priceCents * line.quantity, note: line.note?.trim() || null }; });
    const itemsTotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
    const orderId = randomUUID(); const createdAt = new Date().toISOString();
    const trackingToken = randomBytes(32).toString('base64url');
    const trackingTokenHash = createHash('sha256').update(trackingToken).digest('hex');
    try {
      await this.db.$executeRawUnsafe(`INSERT INTO commerce_native_orders (id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,items_total_cents,delivery_fee_cents,total_cents,payment_method,payment_status,provider_payment_id,status,tracking_token_hash,created_at,updated_at) VALUES ($1::uuid,$2,$3,'VERO_NATIVE',$4,$5,$6,$7,0,$7,$8,$9,$10,'RECEIVED',$11,$12::timestamptz,$12::timestamptz)`, orderId, tenantId, request.menuSlug, request.customer.name.trim(), request.customer.phone.trim(), request.fulfillment, itemsTotalCents, request.payment.method, request.payment.status, request.payment.paymentId || null, trackingTokenHash, createdAt);
      for (const item of items) await this.db.$executeRawUnsafe(`INSERT INTO commerce_native_order_items (id,order_id,menu_item_id,name,quantity,unit_price_cents,total_cents,note) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)`, randomUUID(), orderId, item.menuItemId, item.name, item.quantity, item.unitPriceCents, item.totalCents, item.note);
      await this.db.$executeRawUnsafe(`INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at) VALUES ($1::uuid,$2::uuid,NULL,'RECEIVED',$3::timestamptz)`, randomUUID(), orderId, createdAt);
    } catch { throw new BadRequestException('Could not persist native order.'); }
    return { orderId, trackingToken, provider: 'VERO_NATIVE', menuSlug: request.menuSlug, fulfillment: request.fulfillment, items, itemsTotalCents, deliveryFeeCents: 0, totalCents: itemsTotalCents, paymentMethod: request.payment.method, paymentStatus: request.payment.status, status: 'RECEIVED', createdAt };
  }
}
