import { createHash } from 'node:crypto';
import type { CheckoutPricing } from './checkout-pricing.js';
import type { CheckoutAddress, CheckoutCustomer, FulfillmentMode } from './checkout.types.js';
import type { PaymentMethod } from './payment.types.js';

type PaymentIntent = {
  tenantId: string;
  menuSlug: string;
  method: PaymentMethod;
  customer: CheckoutCustomer;
  fulfillment: FulfillmentMode;
  address?: CheckoutAddress | null | undefined;
  orderNote?: string | undefined;
  pricing: CheckoutPricing;
};

export function hashPaymentValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function paymentCheckoutHash(checkoutId: string): string {
  return hashPaymentValue(checkoutId.trim());
}

export function paymentAttemptId(tenantId: string, checkoutHash: string): string {
  const value = hashPaymentValue(`${tenantId}:${checkoutHash}`).slice(0, 32).split('');
  value[12] = '5';
  value[16] = ((Number.parseInt(value[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  const hex = value.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function paymentExternalReference(attemptId: string): string {
  return `vero_${attemptId.replaceAll('-', '')}`;
}

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function paymentRequestHash(intent: PaymentIntent): string {
  const address =
    intent.fulfillment === 'DELIVERY' && intent.address
      ? {
          street: clean(intent.address.street),
          number: clean(intent.address.number),
          district: clean(intent.address.district),
          city: clean(intent.address.city),
          stateCode: clean(intent.address.stateCode)?.toUpperCase() ?? null,
          postalCode: clean(intent.address.postalCode),
          complement: clean(intent.address.complement),
          reference: clean(intent.address.reference)
        }
      : null;
  const canonical = {
    tenantId: intent.tenantId,
    menuSlug: intent.menuSlug.trim(),
    method: intent.method,
    currency: 'BRL',
    amountCents: intent.pricing.totalCents,
    customer: {
      name: intent.customer.name.trim(),
      phone: intent.customer.phone.trim(),
      email: intent.customer.email?.trim().toLowerCase() || null
    },
    fulfillment: intent.fulfillment,
    address,
    orderNote: clean(intent.orderNote),
    couponCode: intent.pricing.coupon?.code ?? null,
    items: intent.pricing.items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      note: item.note
    }))
  };
  return hashPaymentValue(JSON.stringify(canonical));
}
