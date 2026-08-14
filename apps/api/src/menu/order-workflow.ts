import type { NativeOrderStatus } from './native-order.types.js';

const transitions: Record<NativeOrderStatus, readonly NativeOrderStatus[]> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function canTransitionOrder(from: NativeOrderStatus, to: NativeOrderStatus): boolean {
  return transitions[from].includes(to);
}

export function assertOrderTransition(from: NativeOrderStatus, to: NativeOrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new Error(`INVALID_ORDER_TRANSITION:${from}->${to}`);
}
