import { parseConfiguration } from '@vero/core-configuration';
import type {
  ExternalOrderInboxRecord,
  PrismaExternalOrderInboxRepository,
  ReceiveExternalOrderInput,
} from '@vero/infrastructure-database';

import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { ExternalOrderService } from './external-order.service.js';

const receivedAt = new Date('2026-08-02T03:00:00.000Z');

function orderRecord(
  overrides: Partial<ExternalOrderInboxRecord> = {},
): ExternalOrderInboxRecord {
  return {
    tenantId: 'santo-parma',
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-1',
    externalOrderId: 'order-1',
    reference: '1001',
    customerName: null,
    orderType: 'DELIVERY',
    salesChannel: 'ANOTA_AI',
    currency: 'BRL',
    subtotalCents: 5000,
    discountCents: 0,
    deliveryFeeCents: 500,
    totalCents: 5500,
    items: [
      {
        providerItemId: 'item-1',
        name: 'Parmegiana',
        quantity: 1,
        unitPriceCents: 5000,
        totalCents: 5000,
        mappedProductId: '6ebd44b8-2cc1-4c6c-9064-290f59635ef5',
        modifiers: [],
      },
    ],
    status: 'RECEIVED',
    mappingStatus: 'MAPPED',
    occurredAt: receivedAt,
    observedAt: receivedAt,
    sourceRevision: '2026-08-02T03:00:00.000Z',
    createdAt: receivedAt,
    updatedAt: receivedAt,
    ...overrides,
  };
}

describe(ExternalOrderService.name, () => {
  const apiKey = 'santo-parma-integration-key-123456';
  const security = new MvpSecurityService(
    parseConfiguration({
      VERO_ENVIRONMENT: 'test',
      VERO_POSTGRES_ENABLED: 'true',
      VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero',
      VERO_MVP_ENABLED: 'true',
      VERO_MVP_API_KEY: apiKey,
      VERO_MVP_TENANT_ID: 'santo-parma',
    }),
  );
  const repository = {
    receive: jest.fn(),
    list: jest.fn(),
    find: jest.fn(),
    updateStatus: jest.fn(),
  };
  const service = new ExternalOrderService(
    repository as unknown as PrismaExternalOrderInboxRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('receives an external order only for the authorized tenant', async () => {
    const input: ReceiveExternalOrderInput = orderRecord();
    repository.receive.mockResolvedValue(orderRecord());
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.intake',
    );

    await expect(service.receive(access, input)).resolves.toMatchObject({
      tenantId: 'santo-parma',
      externalOrderId: 'order-1',
    });
    expect(repository.receive).toHaveBeenCalledWith('santo-parma', input);
  });

  it('lists orders using the tenant from the authorized access context', async () => {
    repository.list.mockResolvedValue([]);
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.read',
    );

    await expect(service.list(access, { provider: 'IFOOD', limit: 25 })).resolves.toEqual([]);
    expect(repository.list).toHaveBeenCalledWith('santo-parma', {
      provider: 'IFOOD',
      limit: 25,
    });
  });

  it('blocks confirmation while catalog mapping is pending', async () => {
    repository.find.mockResolvedValue(orderRecord({ mappingStatus: 'PENDING_MAPPING' }));
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.update',
    );

    await expect(
      service.changeStatus(access, 'ANOTA_AI', 'page-1', 'order-1', 'CONFIRMED'),
    ).rejects.toMatchObject({ response: { code: 'ORDER_CATALOG_MAPPING_REQUIRED' } });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects invalid operational status transitions', async () => {
    repository.find.mockResolvedValue(orderRecord({ status: 'COMPLETED' }));
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.update',
    );

    await expect(
      service.changeStatus(access, 'ANOTA_AI', 'page-1', 'order-1', 'PREPARING'),
    ).rejects.toMatchObject({ response: { code: 'INVALID_ORDER_STATUS_TRANSITION' } });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('persists an allowed status transition exactly once', async () => {
    repository.find.mockResolvedValue(orderRecord());
    repository.updateStatus.mockResolvedValue(orderRecord({ status: 'CONFIRMED' }));
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.update',
    );

    await expect(
      service.changeStatus(access, 'ANOTA_AI', 'page-1', 'order-1', 'CONFIRMED'),
    ).resolves.toMatchObject({ status: 'CONFIRMED' });
    expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'santo-parma',
      'ANOTA_AI',
      'page-1',
      'order-1',
      'CONFIRMED',
      expect.any(Date),
    );
  });

  it('rejects an access context issued for another action', async () => {
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'orders.read',
    );

    expect(() => service.receive(access, orderRecord())).toThrow('Unauthorized order access');
    expect(repository.receive).not.toHaveBeenCalled();
  });
});
