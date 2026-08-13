import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
type Row = { orderId: string; status: string; paymentStatus: string; fulfillment: string; createdAt: Date; trackingTokenHash: string };

@Controller('v1/orders')
export class PublicOrderStatusController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Get(':orderId/status')
  async status(@Param('orderId') orderId: string, @Query('token') token?: string) {
    if (!token) throw new NotFoundException();
    const rows = await this.db.$queryRawUnsafe<Row[]>(`SELECT id AS "orderId",status,payment_status AS "paymentStatus",fulfillment,created_at AS "createdAt",tracking_token_hash AS "trackingTokenHash" FROM commerce_native_orders WHERE id=$1::uuid`, orderId);
    const order = rows[0];
    if (!order) throw new NotFoundException();
    const supplied = Buffer.from(createHash('sha256').update(token).digest('hex'));
    const expected = Buffer.from(order.trackingTokenHash);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new NotFoundException();
    return { orderId: order.orderId, status: order.status, paymentStatus: order.paymentStatus, fulfillment: order.fulfillment, createdAt: new Date(order.createdAt).toISOString() };
  }
}
