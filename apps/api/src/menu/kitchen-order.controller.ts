import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { assertOrderTransition } from './order-workflow.js';
import type { NativeOrderStatus } from './native-order.types.js';
type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};
@Controller('v1/kitchen/orders')
export class KitchenOrderController {
  constructor(
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService,
    @Inject(DATABASE_CLIENT) private readonly db: Db
  ) {}
  @Get() async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantId?: string
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.list');
    if (!tenantId) throw new BadRequestException('Tenant is required.');
    return {
      orders: await this.db.$queryRawUnsafe<unknown[]>(
        `SELECT id AS "orderId",menu_slug AS "menuSlug",customer_name AS "customerName",fulfillment,total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt" FROM commerce_native_orders WHERE tenant_id=$1 AND status NOT IN ('COMPLETED','CANCELLED') AND (payment_method='PAY_ON_DELIVERY' OR payment_status='PAID') ORDER BY created_at`,
        tenantId
      )
    };
  }
  @Patch(':orderId/status') async transition(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: { status?: NativeOrderStatus }
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.transition');
    if (!tenantId || !body.status)
      throw new BadRequestException('Tenant and order status are required.');
    const rows = await this.db.$queryRawUnsafe<
      Array<{ status: NativeOrderStatus; paymentMethod: string; paymentStatus: string }>
    >(
      `SELECT status,payment_method AS "paymentMethod",payment_status AS "paymentStatus" FROM commerce_native_orders WHERE id=$1::uuid AND tenant_id=$2`,
      orderId,
      tenantId
    );
    const order = rows[0];
    if (!order) throw new BadRequestException('ORDER_NOT_FOUND');
    if (order.paymentMethod === 'PIX' && order.paymentStatus !== 'PAID')
      throw new BadRequestException('PAYMENT_NOT_CONFIRMED');
    try {
      assertOrderTransition(order.status, body.status);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid order transition.'
      );
    }
    const changed = await this.db.$executeRawUnsafe(
      `UPDATE commerce_native_orders SET status=$1,updated_at=NOW() WHERE id=$2::uuid AND tenant_id=$3 AND status=$4`,
      body.status,
      orderId,
      tenantId,
      order.status
    );
    if (changed !== 1) throw new BadRequestException('ORDER_CONCURRENTLY_CHANGED');
    await this.db.$executeRawUnsafe(
      `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at) VALUES ($1::uuid,$2::uuid,$3,$4,NOW())`,
      randomUUID(),
      orderId,
      order.status,
      body.status
    );
    return { orderId, status: body.status };
  }
}
