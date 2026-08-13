import type { NativeOrder, NativeOrderStatus } from './native-order.types.js';
import { assertOrderTransition } from './order-workflow.js';

const orders = new Map<string, NativeOrder>();

export class KitchenOrderStore {
  save(order: NativeOrder): NativeOrder {
    if (orders.has(order.orderId)) return orders.get(order.orderId)!;
    orders.set(order.orderId, order);
    return order;
  }

  listActive(): NativeOrder[] {
    return [...orders.values()]
      .filter((order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  find(orderId: string): NativeOrder | undefined {
    return orders.get(orderId);
  }

  transition(orderId: string, status: NativeOrderStatus): NativeOrder {
    const order = orders.get(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    assertOrderTransition(order.status, status);
    const updated = { ...order, status };
    orders.set(orderId, updated);
    return updated;
  }
}
