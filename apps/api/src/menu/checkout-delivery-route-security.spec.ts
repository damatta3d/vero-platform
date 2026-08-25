import { ServiceUnavailableException } from '@nestjs/common';
import { priceCheckout } from './checkout-pricing.js';

describe('checkout delivery route enforcement', () => {
  it('does not fall back to a flat fee when distance pricing is configured without a route provider', async () => {
    const previousKey = process.env.GOOGLE_MAPS_API_KEY;
    const previousProvider = process.env.VERO_MAPS_PROVIDER;
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.VERO_MAPS_PROVIDER = 'GOOGLE';
    const database = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([
          {
            tenantId: 'tenant-a',
            menuItemId: 'item-a',
            name: 'Parmegiana',
            priceCents: 4590,
            available: true
          }
        ])
        .mockResolvedValueOnce([
          {
            deliveryEnabled: true,
            deliveryBaseFeeCents: 1000,
            freeDeliveryAboveCents: null,
            deliveryRadiusKm: null,
            hasDeliveryBands: true
          }
        ])
    };

    try {
      await expect(
        priceCheckout(database, {
          menuSlug: 'santo-parma',
          fulfillment: 'DELIVERY',
          address: {
            postalCode: '79000-001',
            street: 'Rua Cliente',
            number: '10',
            district: 'Centro',
            city: 'Campo Grande',
            stateCode: 'MS'
          },
          items: [{ menuItemId: 'item-a', quantity: 1 }]
        })
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      if (previousKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
      else process.env.GOOGLE_MAPS_API_KEY = previousKey;
      if (previousProvider === undefined) delete process.env.VERO_MAPS_PROVIDER;
      else process.env.VERO_MAPS_PROVIDER = previousProvider;
    }
  });
});
