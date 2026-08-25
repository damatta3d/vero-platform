import { BadRequestException } from '@nestjs/common';

import { calculateCouponDiscount, normalizeCouponCode, priceCheckout } from './checkout-pricing.js';

describe('checkout pricing with coupons', () => {
  it('normalizes codes and calculates percentage and capped fixed discounts', () => {
    expect(normalizeCouponCode('  santo10 ')).toBe('SANTO10');
    expect(calculateCouponDiscount(4590, { discountType: 'PERCENTAGE', discountValue: 10 })).toBe(
      459
    );
    expect(
      calculateCouponDiscount(4590, { discountType: 'FIXED_AMOUNT', discountValue: 9000 })
    ).toBe(4590);
  });

  it('uses server prices and a coupon from the resolved menu tenant', async () => {
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
            id: 'coupon-a',
            code: 'SANTO10',
            name: 'Santo 10',
            source: 'RC1',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            active: true,
            startsAt: null,
            expiresAt: null,
            minimumOrderCents: 0,
            maxUses: null,
            usesCount: 0
          }
        ])
    };

    await expect(
      priceCheckout(database, {
        menuSlug: 'santo-parma',
        couponCode: 'santo10',
        items: [{ menuItemId: 'item-a', quantity: 2 }]
      })
    ).resolves.toMatchObject({
      tenantId: 'tenant-a',
      itemsTotalCents: 9180,
      discountCents: 918,
      totalCents: 8262,
      coupon: { code: 'SANTO10' }
    });
    expect(database.$queryRawUnsafe.mock.calls[1]?.slice(1)).toEqual(['tenant-a', 'SANTO10']);
  });

  it('keeps the existing zero delivery fee outside the item-only coupon base', async () => {
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
            id: 'coupon-a',
            code: 'FIXO500',
            name: 'Fixo 500',
            source: null,
            discountType: 'FIXED_AMOUNT',
            discountValue: 500,
            active: true,
            startsAt: null,
            expiresAt: null,
            minimumOrderCents: 0,
            maxUses: null,
            usesCount: 0
          }
        ])
    };

    await expect(
      priceCheckout(database, {
        menuSlug: 'santo-parma',
        couponCode: 'FIXO500',
        items: [{ menuItemId: 'item-a', quantity: 1 }]
      })
    ).resolves.toMatchObject({
      itemsTotalCents: 4590,
      discountCents: 500,
      deliveryFeeCents: 0,
      totalCents: 4090
    });
  });

  it('calculates item subtotal minus coupon plus delivery entirely on the server', async () => {
    const database = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([
          {
            tenantId: 'tenant-a',
            menuItemId: 'item-a',
            name: 'Parmegiana família',
            priceCents: 10_000,
            available: true
          }
        ])
        .mockResolvedValueOnce([
          {
            id: 'coupon-a',
            code: 'SANTO10',
            name: 'Santo 10',
            source: null,
            discountType: 'PERCENTAGE',
            discountValue: 10,
            active: true,
            startsAt: null,
            expiresAt: null,
            minimumOrderCents: 0,
            maxUses: null,
            usesCount: 0
          }
        ])
        .mockResolvedValueOnce([
          {
            deliveryEnabled: true,
            deliveryBaseFeeCents: 1000,
            freeDeliveryAboveCents: null
          }
        ])
    };

    await expect(
      priceCheckout(database, {
        menuSlug: 'santo-parma',
        couponCode: 'SANTO10',
        fulfillment: 'DELIVERY',
        items: [{ menuItemId: 'item-a', quantity: 1 }]
      })
    ).resolves.toMatchObject({
      itemsTotalCents: 10_000,
      discountCents: 1000,
      deliveryFeeCents: 1000,
      totalCents: 10_000
    });
  });

  it.each([
    ['inactive', { active: false }],
    ['not started', { startsAt: new Date('2026-08-20T12:00:01.000Z') }],
    ['expired', { expiresAt: new Date('2026-08-20T12:00:00.000Z') }],
    ['exhausted', { maxUses: 1, usesCount: 1 }],
    ['below minimum', { minimumOrderCents: 5000 }]
  ])('rejects an %s coupon', async (_reason, override) => {
    const menuItem = {
      tenantId: 'tenant-a',
      menuItemId: 'item-a',
      name: 'Parmegiana',
      priceCents: 4590,
      available: true
    };
    const coupon = {
      id: 'coupon-a',
      code: 'LIMITADO',
      name: 'Limitado',
      source: null,
      discountType: 'FIXED_AMOUNT',
      discountValue: 500,
      active: true,
      startsAt: null,
      expiresAt: null,
      minimumOrderCents: 0,
      maxUses: null,
      usesCount: 0,
      ...override
    };
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([menuItem]).mockResolvedValueOnce([coupon])
    };
    await expect(
      priceCheckout(
        database,
        {
          menuSlug: 'santo-parma',
          couponCode: 'LIMITADO',
          items: [{ menuItemId: 'item-a', quantity: 1 }]
        },
        { now: new Date('2026-08-20T12:00:00.000Z') }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts the exact validity start and locks a coupon for final order creation', async () => {
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
            id: 'coupon-a',
            code: 'AGORA10',
            name: 'Agora 10',
            source: null,
            discountType: 'PERCENTAGE',
            discountValue: 10,
            active: true,
            startsAt: new Date('2026-08-20T12:00:00.000Z'),
            expiresAt: new Date('2026-08-20T13:00:00.000Z'),
            minimumOrderCents: 0,
            maxUses: 1,
            usesCount: 0
          }
        ])
    };

    await expect(
      priceCheckout(
        database,
        {
          menuSlug: 'santo-parma',
          couponCode: 'AGORA10',
          items: [{ menuItemId: 'item-a', quantity: 1 }]
        },
        { lockCoupon: true, now: new Date('2026-08-20T12:00:00.000Z') }
      )
    ).resolves.toMatchObject({ discountCents: 459 });
    expect(database.$queryRawUnsafe.mock.calls[1]?.[0]).toContain('FOR UPDATE');
  });

  it('rejects totals that exceed the supported monetary range', async () => {
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
        {
          tenantId: 'tenant-a',
          menuItemId: 'item-a',
          name: 'Evento',
          priceCents: 2_000_000,
          available: true
        }
      ])
    };

    await expect(
      priceCheckout(database, {
        menuSlug: 'santo-parma',
        items: [{ menuItemId: 'item-a', quantity: 100 }]
      })
    ).rejects.toThrow('O valor do pedido excede o limite permitido.');
  });
});
