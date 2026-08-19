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
  provider: 'VERO_NATIVE';
  menuSlug: string;
  customerName: string;
  customerPhone: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  items: NativeOrderItem[];
  itemsTotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  coupon: {
    id: string;
    code: string;
    name: string;
    source: string | null;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
  } | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  providerPaymentId: string | null;
  status: NativeOrderStatus;
  createdAt: string;
};
