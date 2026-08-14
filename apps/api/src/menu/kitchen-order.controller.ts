import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Query
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { assertOrderTransition, nextOrderStatuses } from './order-workflow.js';
import type { NativeOrderStatus } from './native-order.types.js';
type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};
const activeStatuses: readonly NativeOrderStatus[] = [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED'
];
@Controller('v1/kitchen/orders')
export class KitchenOrderController {
  constructor(
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService,
    @Inject(DATABASE_CLIENT) private readonly db: Db
  ) {}
  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Query('status') status?: NativeOrderStatus,
    @Query('updatedAfter') updatedAfter?: string
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.list');
    if (!tenantId) throw new BadRequestException('Tenant is required.');
    if (status && !activeStatuses.includes(status))
      throw new BadRequestException('INVALID_ACTIVE_ORDER_STATUS');
    const updatedAfterDate = updatedAfter ? new Date(updatedAfter) : null;
    if (updatedAfterDate && Number.isNaN(updatedAfterDate.getTime()))
      throw new BadRequestException('INVALID_UPDATED_AFTER');
    const orders = await this.db.$queryRawUnsafe<Array<{ status: NativeOrderStatus }>>(
      `SELECT id AS "orderId",menu_slug AS "menuSlug",customer_name AS "customerName",fulfillment,total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt",updated_at AS "updatedAt" FROM commerce_native_orders WHERE tenant_id=$1 AND status NOT IN ('COMPLETED','CANCELLED') AND (payment_method='PAY_ON_DELIVERY' OR payment_status='PAID') AND ($2::text IS NULL OR status=$2) AND ($3::timestamptz IS NULL OR updated_at>$3) ORDER BY created_at`,
      tenantId,
      status ?? null,
      updatedAfterDate?.toISOString() ?? null
    );
    return {
      orders: orders.map((order) => ({
        ...order,
        allowedTransitions: nextOrderStatuses(order.status)
      })),
      sync: { serverTime: new Date().toISOString() }
    };
  }
  @Get(':orderId')
  async detail(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('orderId') orderId: string
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.list');
    if (!tenantId) throw new BadRequestException('Tenant is required.');
    const orders = await this.db.$queryRawUnsafe<Array<{ status: NativeOrderStatus }>>(
      `SELECT id AS "orderId",menu_slug AS "menuSlug",customer_name AS "customerName",customer_phone AS "customerPhone",fulfillment,NULL::text AS "deliveryAddress",items_total_cents AS "itemsTotalCents",delivery_fee_cents AS "deliveryFeeCents",total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt",updated_at AS "updatedAt" FROM commerce_native_orders WHERE id=$1::uuid AND tenant_id=$2`,
      orderId,
      tenantId
    );
    const order = orders[0];
    if (!order) throw new BadRequestException('ORDER_NOT_FOUND');
    const items = await this.db.$queryRawUnsafe<unknown[]>(
      `SELECT id,menu_item_id AS "menuItemId",name,quantity,unit_price_cents AS "unitPriceCents",total_cents AS "totalCents",note FROM commerce_native_order_items WHERE order_id=$1::uuid ORDER BY id`,
      orderId
    );
    const history = await this.db.$queryRawUnsafe<unknown[]>(
      `SELECT from_status AS "fromStatus",to_status AS "toStatus",occurred_at AS "occurredAt" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at`,
      orderId
    );
    return {
      order: { ...order, allowedTransitions: nextOrderStatuses(order.status) },
      items,
      history
    };
  }
  @Patch(':orderId/status')
  async transition(
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
    return {
      orderId,
      status: body.status,
      allowedTransitions: nextOrderStatuses(body.status)
    };
  }
}
