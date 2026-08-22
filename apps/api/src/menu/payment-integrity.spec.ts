import type { CheckoutPricing } from './checkout-pricing.js';
import {
  paymentAttemptId,
  paymentCheckoutHash,
  paymentExternalReference,
  paymentRequestHash
} from './payment-integrity.js';

describe('payment integrity', () => {
  const pricing: CheckoutPricing = {
    tenantId: 'tenant-a',
    items: [
      {
        menuItemId: 'item-a',
        name: 'Parmegiana',
        quantity: 1,
        unitPriceCents: 10_000,
        totalCents: 10_000,
        note: 'Sem cebola'
      }
    ],
    itemsTotalCents: 10_000,
    discountCents: 1000,
    deliveryFeeCents: 1000,
    deliveryDistanceMeters: 2450,
    deliveryQuoteProvider: 'GOOGLE_MAPS',
    deliveryFeeRule: 'DISTANCE_BAND',
    normalizedDeliveryAddress: 'Rua A, 1, Centro, Campo Grande - MS',
    totalCents: 10_000,
    coupon: {
      id: 'coupon-a',
      code: 'SANTO10',
      name: 'Santo 10',
      source: null,
      discountType: 'PERCENTAGE',
      discountValue: 10
    }
  };
  const intent = {
    tenantId: 'tenant-a',
    menuSlug: 'santo-parma',
    method: 'PIX' as const,
    customer: { name: 'Cliente', phone: '67999999999', email: 'CLIENTE@example.com' },
    fulfillment: 'DELIVERY' as const,
    address: {
      postalCode: '79000-000',
      street: 'Rua A',
      number: '1',
      district: 'Centro',
      city: 'Campo Grande',
      stateCode: 'MS'
    },
    orderNote: 'Portão vermelho',
    pricing
  };

  it('creates a stable opaque provider reference without customer data', () => {
    const checkoutHash = paymentCheckoutHash('checkout-key-with-at-least-32-characters');
    const id = paymentAttemptId('tenant-a', checkoutHash);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(paymentAttemptId('tenant-a', checkoutHash)).toBe(id);
    expect(paymentAttemptId('tenant-b', checkoutHash)).not.toBe(id);
    expect(paymentExternalReference(id)).toMatch(/^vero_[0-9a-f]{32}$/);
    expect(paymentExternalReference(id)).not.toContain('Cliente');
  });

  it('binds tenant, customer, cart, notes, coupon and server amount to one checkout', () => {
    const original = paymentRequestHash(intent);
    expect(
      paymentRequestHash({
        ...intent,
        customer: { ...intent.customer, email: 'cliente@example.com' }
      })
    ).toBe(original);
    expect(paymentRequestHash({ ...intent, tenantId: 'tenant-b' })).not.toBe(original);
    expect(paymentRequestHash({ ...intent, pricing: { ...pricing, totalCents: 9999 } })).not.toBe(
      original
    );
    expect(paymentRequestHash({ ...intent, orderNote: 'Outra observação' })).not.toBe(original);
    expect(
      paymentRequestHash({ ...intent, address: { ...intent.address, city: 'Dourados' } })
    ).not.toBe(original);
  });
});
