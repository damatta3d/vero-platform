import type { NativeOrderStatus } from './native-order.types.js';

type OrderFulfillment = 'DELIVERY' | 'PICKUP';

const transitions: Record<NativeOrderStatus, readonly NativeOrderStatus[]> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

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
