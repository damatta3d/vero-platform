import { createHash, timingSafeEqual } from 'node:crypto';
import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { formatOperationalOrderNumber } from './order-number.js';

type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

type Row = {
  orderId: string;
  operationalNumber: number;
  status: string;
  paymentStatus: string;
  fulfillment: string;
  createdAt: Date;
  trackingTokenHash: string | null;
  orderNote: string | null;
  itemsTotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  deliveryDistanceMeters: number | null;
  totalCents: number;
  couponCode: string | null;
};

type ItemRow = { name: string; note: string | null; quantity: number };

@Controller('v1/orders')
export class PublicOrderStatusController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Get(':orderId/status')
  async status(@Param('orderId') orderId: string, @Query('token') token?: string) {
    if (!token) throw new NotFoundException();

    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT id AS "orderId", operational_number AS "operationalNumber", status,
              payment_status AS "paymentStatus", fulfillment, order_note AS "orderNote",
              items_total_cents AS "itemsTotalCents", discount_cents AS "discountCents",
              delivery_fee_cents AS "deliveryFeeCents",
              delivery_distance_m AS "deliveryDistanceMeters",total_cents AS "totalCents",
              coupon_code AS "couponCode",
              created_at AS "createdAt", tracking_token_hash AS "trackingTokenHash"
         FROM commerce_native_orders
        WHERE id = $1::uuid`,
      orderId
    );
    const order = rows[0];
    if (!order?.trackingTokenHash) throw new NotFoundException();

    const supplied = Buffer.from(createHash('sha256').update(token).digest('hex'));
    const expected = Buffer.from(order.trackingTokenHash);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new NotFoundException();
    }

    const items = await this.db.$queryRawUnsafe<ItemRow[]>(
      `SELECT name, quantity, note
         FROM commerce_native_order_items
        WHERE order_id=$1::uuid
        ORDER BY id`,
      orderId
    );

    return {
      orderId: order.orderId,
      orderNumber: formatOperationalOrderNumber(order.operationalNumber),
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillment: order.fulfillment,
      createdAt: new Date(order.createdAt).toISOString(),
      orderNote: order.orderNote,
      itemsTotalCents: order.itemsTotalCents,
      discountCents: order.discountCents,
      deliveryFeeCents: order.deliveryFeeCents,
      deliveryDistanceMeters: order.deliveryDistanceMeters,
      totalCents: order.totalCents,
      couponCode: order.couponCode,
      items
    };
  }
}
