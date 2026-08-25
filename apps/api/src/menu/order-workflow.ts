import { randomUUID } from 'node:crypto';
import type { NativeOrderStatus } from './native-order.types.js';

type OrderFulfillment = 'DELIVERY' | 'PICKUP';
export type ConfirmationSource = 'AUTO' | 'MANUAL';

type WorkflowDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction?<T>(callback: (transaction: WorkflowDatabase) => Promise<T>): Promise<T>;
};

const transitions: Record<NativeOrderStatus, readonly NativeOrderStatus[]> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

const couponReleasablePaymentStatuses = new Set([
  'PENDING',
  'AWAITING_PAYMENT',
  'FAILED',
  'CANCELLED'
]);

export function nextOrderStatuses(
  from: NativeOrderStatus,
  fulfillment: OrderFulfillment
): readonly NativeOrderStatus[] {
  const next = transitions[from];
  return fulfillment === 'PICKUP' ? next.filter((status) => status !== 'DISPATCHED') : next;
}

export function canTransitionOrder(
  from: NativeOrderStatus,
  to: NativeOrderStatus,
  fulfillment: OrderFulfillment
): boolean {
  return nextOrderStatuses(from, fulfillment).includes(to);
}

export function assertOrderTransition(
  from: NativeOrderStatus,
  to: NativeOrderStatus,
  fulfillment: OrderFulfillment
): void {
  if (!canTransitionOrder(from, to, fulfillment))
    throw new Error(`INVALID_ORDER_TRANSITION:${from}->${to}`);
}

export async function transitionPersistedOrder(
  database: WorkflowDatabase,
  tenantId: string,
  orderId: string,
  to: NativeOrderStatus,
  confirmationSource?: ConfirmationSource
): Promise<{ status: NativeOrderStatus; fulfillment: OrderFulfillment }> {
  const perform = async (
    client: WorkflowDatabase
  ): Promise<{ status: NativeOrderStatus; fulfillment: OrderFulfillment }> => {
    const rows = await client.$queryRawUnsafe<
      Array<{
        status: NativeOrderStatus;
        paymentMethod: string;
        paymentStatus: string;
        fulfillment: OrderFulfillment;
        couponId: string | null;
      }>
    >(
      `SELECT status, fulfillment, payment_method AS "paymentMethod",
              payment_status AS "paymentStatus", coupon_id AS "couponId"
         FROM commerce_native_orders
        WHERE id=$1::uuid AND tenant_id=$2`,
      orderId,
      tenantId
    );
    const order = rows[0];
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (order.status === 'CANCELLED' && to === 'CANCELLED') {
      return { status: 'CANCELLED', fulfillment: order.fulfillment };
    }
    if (
      order.paymentMethod === 'PIX' &&
      order.paymentStatus !== 'PAID' &&
      to !== 'CANCELLED'
    ) {
      throw new Error('PAYMENT_NOT_CONFIRMED');
    }
    assertOrderTransition(order.status, to, order.fulfillment);
    const source = to === 'CONFIRMED' ? confirmationSource : undefined;
    if (to === 'CONFIRMED' && !source) throw new Error('CONFIRMATION_SOURCE_REQUIRED');
    const changed = await client.$executeRawUnsafe(
      `UPDATE commerce_native_orders
          SET status=$1::varchar(32),
              confirmed_source=CASE
                WHEN $1::varchar(32)='CONFIRMED' THEN $5::varchar(16)
                ELSE confirmed_source
              END,
              confirmed_at=CASE
                WHEN $1::varchar(32)='CONFIRMED' THEN NOW()
                ELSE confirmed_at
              END,
              updated_at=NOW()
        WHERE id=$2::uuid AND tenant_id=$3 AND status=$4::varchar(32)`,
      to,
      orderId,
      tenantId,
      order.status,
      source ?? null
    );
    if (changed !== 1) throw new Error('ORDER_CONCURRENTLY_CHANGED');
    if (
      to === 'CANCELLED' &&
      order.couponId &&
      couponReleasablePaymentStatuses.has(order.paymentStatus)
    ) {
      await client.$executeRawUnsafe(
        `UPDATE commerce_coupons
            SET uses_count=GREATEST(uses_count-1,0),updated_at=NOW()
          WHERE tenant_id=$1 AND id=$2::uuid AND uses_count>0`,
        tenantId,
        order.couponId
      );
    }
    await client.$executeRawUnsafe(
      `INSERT INTO commerce_native_order_status_history
         (id,order_id,from_status,to_status,occurred_at)
       VALUES ($1::uuid,$2::uuid,$3,$4,NOW())`,
      randomUUID(),
      orderId,
      order.status,
      to
    );
    return { status: to, fulfillment: order.fulfillment };
  };

  return database.$transaction ? database.$transaction(perform) : perform(database);
}
