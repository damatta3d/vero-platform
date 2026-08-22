import { BadRequestException } from '@nestjs/common';
import { DeliveryAdminController } from './delivery-admin.controller.js';

describe('delivery fee band administration', () => {
  const authorization = 'Bearer token';
  const tenantId = 'tenant-a';

  it('rejects gaps and overlaps before writing', async () => {
    const database = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn()
    };
    const security = { authorize: jest.fn().mockResolvedValue({ tenantId }) };
    const controller = new DeliveryAdminController(database as never, security as never);
    await expect(
      controller.replace(authorization, tenantId, {
        bands: [
          { minDistanceMeters: 0, maxDistanceMeters: 500, feeCents: 0, active: true },
          { minDistanceMeters: 600, maxDistanceMeters: 1000, feeCents: 800, active: true }
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('replaces one tenant table transactionally with server-owned sequence values', async () => {
    const transaction = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn()
    };
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          sequence: 0,
          minDistanceMeters: 0,
          maxDistanceMeters: 500,
          feeCents: 0,
          active: true
        }
      ]),
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    const security = { authorize: jest.fn().mockResolvedValue({ tenantId }) };
    const controller = new DeliveryAdminController(database as never, security as never);
    await controller.replace(authorization, tenantId, {
      bands: [{ minDistanceMeters: 0, maxDistanceMeters: 500, feeCents: 0, active: true }]
    });
    expect(transaction.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM store_delivery_fee_bands'),
      tenantId
    );
    expect(transaction.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO store_delivery_fee_bands'),
      tenantId,
      0,
      0,
      500,
      0,
      true
    );
    expect(security.authorize).toHaveBeenCalledWith(
      authorization,
      tenantId,
      'delivery.settings.write'
    );
  });
});
