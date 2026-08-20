import type { PaymentMethod, PaymentStatus } from './payment.types.js';

export type NativeOrderStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type NativeOrderItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  note: string | null;
};

export type NativeOrder = {
  orderId: string;
  orderNumber: string | null;
  provider: 'VERO_NATIVE';
  menuSlug: string;
  customerName: string;
  customerPhone: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  deliveryAddress: Record<string, string> | null;
  orderNote: string | null;
  items: NativeOrderItem[];
  itemsTotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  providerPaymentId: string | null;
  status: NativeOrderStatus;
  createdAt: string;
};
