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
import { randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { nextOrderStatuses, transitionPersistedOrder } from './order-workflow.js';
import type { NativeOrderStatus } from './native-order.types.js';
import { formatOperationalOrderNumber } from './order-number.js';
type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (transaction: Db) => Promise<T>): Promise<T>;
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
    const orders = await this.db.$queryRawUnsafe<
      Array<{
        operationalNumber: number;
        status: NativeOrderStatus;
        fulfillment: 'DELIVERY' | 'PICKUP';
      }>
    >(
      `SELECT id AS "orderId",operational_number AS "operationalNumber",menu_slug AS "menuSlug",customer_name AS "customerName",fulfillment,total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt",updated_at AS "updatedAt" FROM commerce_native_orders WHERE tenant_id=$1 AND status NOT IN ('COMPLETED','CANCELLED') AND (payment_method='PAY_ON_DELIVERY' OR payment_status='PAID') AND ($2::text IS NULL OR status=$2) AND ($3::timestamptz IS NULL OR updated_at>$3) ORDER BY created_at`,
      tenantId,
      status ?? null,
      updatedAfterDate?.toISOString() ?? null
    );
    return {
      orders: orders.map(({ operationalNumber, ...order }) => ({
        ...order,
        orderNumber: formatOperationalOrderNumber(operationalNumber),
        allowedTransitions: nextOrderStatuses(order.status, order.fulfillment)
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
    const orders = await this.db.$queryRawUnsafe<
      Array<{
        operationalNumber: number;
        status: NativeOrderStatus;
        fulfillment: 'DELIVERY' | 'PICKUP';
      }>
    >(
      `SELECT id AS "orderId",operational_number AS "operationalNumber",menu_slug AS "menuSlug",customer_name AS "customerName",customer_phone AS "customerPhone",fulfillment,delivery_address AS "deliveryAddress",order_note AS "orderNote",items_total_cents AS "itemsTotalCents",discount_cents AS "discountCents",delivery_fee_cents AS "deliveryFeeCents",total_cents AS "totalCents",coupon_code AS "couponCode",coupon_name AS "couponName",coupon_source AS "couponSource",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt",updated_at AS "updatedAt" FROM commerce_native_orders WHERE id=$1::uuid AND tenant_id=$2`,
      orderId,
      tenantId
    );
    const storedOrder = orders[0];
    if (!storedOrder) throw new BadRequestException('ORDER_NOT_FOUND');
    const { operationalNumber, ...order } = storedOrder;
    const items = await this.db.$queryRawUnsafe<unknown[]>(
      `SELECT id,menu_item_id AS "menuItemId",name,quantity,unit_price_cents AS "unitPriceCents",total_cents AS "totalCents",note FROM commerce_native_order_items WHERE order_id=$1::uuid ORDER BY id`,
      orderId
    );
    const history = await this.db.$queryRawUnsafe<unknown[]>(
      `SELECT from_status AS "fromStatus",to_status AS "toStatus",occurred_at AS "occurredAt" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at`,
      orderId
    );
    return {
      order: {
        ...order,
        orderNumber: formatOperationalOrderNumber(operationalNumber),
        allowedTransitions: nextOrderStatuses(order.status, order.fulfillment)
      },
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
    try {
      const order = await transitionPersistedOrder(
        this.db,
        tenantId,
        orderId,
        body.status,
        body.status === 'CONFIRMED' ? 'MANUAL' : undefined
      );
      return {
        orderId,
        status: body.status,
        allowedTransitions: nextOrderStatuses(body.status, order.fulfillment)
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid order transition.'
      );
    }
  }

  @Patch(':orderId/payment')
  async receivePayment(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: { status?: 'PAID' }
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.payment.receive');
    if (!tenantId || body.status !== 'PAID') {
      throw new BadRequestException('Informe a confirmação do pagamento recebido.');
    }
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          paymentId: string | null;
          paymentMethod: string;
          paymentStatus: string;
        }>
      >(
        `SELECT payment_id AS "paymentId",payment_method AS "paymentMethod",
                payment_status AS "paymentStatus"
           FROM commerce_native_orders
          WHERE id=$1::uuid AND tenant_id=$2 FOR UPDATE`,
        orderId,
        tenantId
      );
      const order = rows[0];
      if (!order) throw new BadRequestException('ORDER_NOT_FOUND');
      if (order.paymentMethod !== 'PAY_ON_DELIVERY') {
        throw new BadRequestException('Somente pagamentos ao receber podem ser confirmados aqui.');
      }
      if (order.paymentStatus === 'PAID') return { orderId, paymentStatus: 'PAID' };
      if (order.paymentStatus !== 'PENDING') {
        throw new BadRequestException('A situação atual do pagamento não permite confirmação.');
      }
      await tx.$executeRawUnsafe(
        `UPDATE commerce_native_orders SET payment_status='PAID',updated_at=NOW()
          WHERE id=$1::uuid AND tenant_id=$2 AND payment_status='PENDING'`,
        orderId,
        tenantId
      );
      if (order.paymentId) {
        await tx.$executeRawUnsafe(
          `UPDATE commerce_payment_attempts
              SET status='PAID',provider_status='received_by_operator',updated_at=NOW()
            WHERE id=$1::uuid AND tenant_id=$2 AND method='PAY_ON_DELIVERY' AND status='PENDING'`,
          order.paymentId,
          tenantId
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_payment_status_history
             (id,payment_id,from_status,to_status,provider_status,source,occurred_at)
           VALUES ($1::uuid,$2::uuid,'PENDING','PAID','received_by_operator','MANAGER',NOW())`,
          randomUUID(),
          order.paymentId
        );
      }
      return { orderId, paymentStatus: 'PAID' };
    });
  }
}
