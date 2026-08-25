import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { quoteDelivery, selectDeliveryFee } from './delivery-pricing.js';

const bands = [
  { sequence: 0, minDistanceM: 0, maxDistanceM: 500, feeCents: 0, active: true },
  { sequence: 1, minDistanceM: 500, maxDistanceM: 1000, feeCents: 800, active: true },
  { sequence: 2, minDistanceM: 1000, maxDistanceM: 2000, feeCents: 1000, active: true }
];

describe('delivery pricing', () => {
  it('uses inclusive starts, exclusive ends and an inclusive final upper bound', () => {
    expect(
      selectDeliveryFee({
        distanceMeters: 499,
        itemsTotalCents: 1000,
        baseFeeCents: 1500,
        freeAboveCents: null,
        bands
      })
    ).toEqual({ feeCents: 0, feeRule: 'BAND:0' });
    expect(
      selectDeliveryFee({
        distanceMeters: 500,
        itemsTotalCents: 1000,
        baseFeeCents: 1500,
        freeAboveCents: null,
        bands
      })
    ).toEqual({ feeCents: 800, feeRule: 'BAND:1' });
    expect(
      selectDeliveryFee({
        distanceMeters: 2000,
        itemsTotalCents: 1000,
        baseFeeCents: 1500,
        freeAboveCents: null,
        bands
      })
    ).toEqual({ feeCents: 1000, feeRule: 'BAND:2' });
  });

  it('uses free-above before a band and falls back outside configured active ranges', () => {
    expect(
      selectDeliveryFee({
        distanceMeters: 900,
        itemsTotalCents: 10_000,
        baseFeeCents: 1500,
        freeAboveCents: 10_000,
        bands
      })
    ).toEqual({ feeCents: 0, feeRule: 'FREE_ABOVE:10000' });
    expect(
      selectDeliveryFee({
        distanceMeters: 2500,
        itemsTotalCents: 1000,
        baseFeeCents: 1500,
        freeAboveCents: null,
        bands
      })
    ).toEqual({ feeCents: 1500, feeRule: 'BASE_FEE' });
  });

  it('quotes a tenant-scoped road route and returns the normalized address', async () => {
    const database = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([
          {
            deliveryEnabled: true,
            maxRadiusKm: 10,
            baseFeeCents: 1500,
            freeAboveCents: null,
            address: 'Rua da Loja, 1',
            neighborhood: 'Centro',
            city: 'Campo Grande',
            stateCode: 'MS',
            postalCode: '79000-000'
          }
        ])
        .mockResolvedValueOnce(bands)
    };
    const route = jest.fn().mockResolvedValue({
      distanceMeters: 500,
      provider: 'FAKE_ROAD_ROUTE',
      normalizedDestination: 'Rua Cliente, 10, Campo Grande - MS'
    });

    await expect(
      quoteDelivery(
        database,
        { route },
        {
          tenantId: 'tenant-a',
          itemsTotalCents: 5000,
          address: {
            postalCode: '79000-001',
            street: 'Rua Cliente',
            number: '10',
            district: 'Centro',
            city: 'Campo Grande',
            stateCode: 'MS'
          }
        }
      )
    ).resolves.toEqual({
      distanceMeters: 500,
      feeCents: 800,
      provider: 'FAKE_ROAD_ROUTE',
      feeRule: 'BAND:1',
      normalizedAddress: 'Rua Cliente, 10, Campo Grande - MS'
    });
    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.stringContaining('Rua da Loja'),
        destination: expect.stringContaining('Rua Cliente, 10')
      })
    );
  });

  it('rejects addresses outside the tenant radius', async () => {
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
        {
          deliveryEnabled: true,
          maxRadiusKm: 2,
          baseFeeCents: 1500,
          freeAboveCents: null,
          address: 'Rua da Loja, 1',
          neighborhood: 'Centro',
          city: 'Campo Grande',
          stateCode: 'MS',
          postalCode: '79000-000'
        }
      ])
    };
    await expect(
      quoteDelivery(
        database,
        { route: jest.fn().mockResolvedValue({ distanceMeters: 2001, provider: 'FAKE' }) },
        {
          tenantId: 'tenant-a',
          itemsTotalCents: 5000,
          address: {
            postalCode: '79000-001',
            street: 'Rua Cliente',
            number: '10',
            district: 'Centro',
            city: 'Campo Grande',
            stateCode: 'MS'
          }
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates provider unavailability without applying a guessed fee', async () => {
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
        {
          deliveryEnabled: true,
          maxRadiusKm: 10,
          baseFeeCents: 1500,
          freeAboveCents: null,
          address: 'Rua da Loja, 1',
          neighborhood: 'Centro',
          city: 'Campo Grande',
          stateCode: 'MS',
          postalCode: '79000-000'
        }
      ])
    };
    await expect(
      quoteDelivery(
        database,
        { route: jest.fn().mockRejectedValue(new ServiceUnavailableException('offline')) },
        {
          tenantId: 'tenant-a',
          itemsTotalCents: 5000,
          address: {
            postalCode: '79000-001',
            street: 'Rua Cliente',
            number: '10',
            district: 'Centro',
            city: 'Campo Grande',
            stateCode: 'MS'
          }
        }
      )
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
