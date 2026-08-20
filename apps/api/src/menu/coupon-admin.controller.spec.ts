import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CouponAdminController } from './coupon-admin.controller.js';

describe(CouponAdminController.name, () => {
  const authorize = jest.fn().mockResolvedValue(undefined);
  const query = jest.fn();
  const execute = jest.fn().mockResolvedValue(1);
  const controller = new CouponAdminController(
    { $queryRawUnsafe: query, $executeRawUnsafe: execute },
    { authorize } as never
  );

  beforeEach(() => {
    authorize.mockClear();
    query.mockReset();
    execute.mockClear();
  });

  it('lists and writes coupons only after tenant-scoped authorization', async () => {
    query.mockResolvedValueOnce([]);
    await expect(controller.list('Bearer token', 'tenant-a')).resolves.toEqual([]);
    expect(authorize).toHaveBeenCalledWith('Bearer token', 'tenant-a', 'coupons.read');

    await expect(
      controller.create('Bearer token', 'tenant-a', {
        code: ' santo10 ',
        name: 'Santo 10',
        discountType: 'PERCENTAGE',
        discountValue: 10
      })
    ).resolves.toMatchObject({
      tenantId: 'tenant-a',
      code: 'SANTO10',
      discountValue: 10,
      usesCount: 0
    });
    expect(authorize).toHaveBeenLastCalledWith('Bearer token', 'tenant-a', 'coupons.write');
    expect(execute.mock.calls[0]).toEqual(expect.arrayContaining(['tenant-a', 'SANTO10']));
  });

  it('rejects invalid percentage, empty tenant and cross-tenant update lookup', async () => {
    await expect(
      controller.create('Bearer token', 'tenant-a', {
        code: 'INVALID',
        name: 'Invalid',
        discountType: 'PERCENTAGE',
        discountValue: 101
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.list('Bearer token', ' ')).rejects.toBeInstanceOf(BadRequestException);

    query.mockResolvedValueOnce([]);
    await expect(
      controller.update('Bearer token', 'tenant-b', '76000000-0000-4000-8000-000000000001', {
        active: false
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query.mock.calls[0]).toEqual(
      expect.arrayContaining(['tenant-b', '76000000-0000-4000-8000-000000000001'])
    );
  });
});
