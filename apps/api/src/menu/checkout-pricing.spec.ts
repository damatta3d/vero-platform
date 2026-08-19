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

  it.each([
    ['inactive', { active: false }],
    ['not started', { startsAt: new Date(Date.now() + 60_000) }],
    ['expired', { expiresAt: new Date(Date.now() - 60_000) }],
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
      priceCheckout(database, {
        menuSlug: 'santo-parma',
        couponCode: 'LIMITADO',
        items: [{ menuItemId: 'item-a', quantity: 1 }]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
