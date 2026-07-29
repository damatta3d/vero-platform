import {
  ChannelOrderFactPersistenceError,
  type ChannelOrderFact
} from '@vero/business-intelligence';
import {
  createDatabaseClient,
  PrismaChannelOrderFactRepository
} from '@vero/infrastructure-database';

describe('intelligence channel order fact persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL'));
  const persistedAt = new Date('2026-07-29T21:30:00.000Z');
  const repository = new PrismaChannelOrderFactRepository(client, {
    now: () => persistedAt
  });
  const tenantA = 'santo-parma-intelligence';
  const tenantB = 'other-restaurant-intelligence';
  const baseFact = fact(tenantA);

  afterAll(async () => {
    await client.$disconnect();
  });

  it('appends once and treats a later observation as an idempotent replay', async () => {
    const inserted = await repository.append(baseFact, {
      receiptId: 'receipt-first',
      ingestionRunId: 'run-first',
      schemaVersion: 'external-order.v1'
    });
    const replayed = await repository.append(
      Object.freeze({
        ...baseFact,
        observedAt: new Date('2026-07-29T21:45:00.000Z')
      }),
      {
        receiptId: 'receipt-replay',
        ingestionRunId: 'run-replay',
        schemaVersion: 'external-order.v1'
      }
    );

    expect(inserted.status).toBe('INSERTED');
    expect(replayed.status).toBe('REPLAYED');
    expect(replayed.persisted).toEqual(inserted.persisted);
    expect(replayed.persisted.provenance).toEqual({
      receiptId: 'receipt-first',
      ingestionRunId: 'run-first',
      schemaVersion: 'external-order.v1'
    });
    await expect(
      client.intelligenceChannelOrderFact.count({ where: { tenantId: tenantA } })
    ).resolves.toBe(1);
  });

  it('rejects conflicting content for the same tenant-aware revision key', async () => {
    await expect(
      repository.append(Object.freeze({ ...baseFact, totalCents: baseFact.totalCents + 1 }), {
        receiptId: 'receipt-conflict',
        ingestionRunId: 'run-conflict',
        schemaVersion: 'external-order.v1'
      })
    ).rejects.toEqual(
      new ChannelOrderFactPersistenceError('IDEMPOTENCY_CONFLICT', 'fact.identity')
    );
  });

  it('isolates identical provider keys between tenants', async () => {
    await expect(
      repository.findRevision({
        tenantId: tenantB,
        connectionId: baseFact.connectionId,
        orderKey: baseFact.orderKey,
        revision: baseFact.revision
      })
    ).resolves.toBeUndefined();

    const otherTenantFact = fact(tenantB);
    const inserted = await repository.append(otherTenantFact, {
      receiptId: 'receipt-other-tenant',
      ingestionRunId: 'run-other-tenant',
      schemaVersion: 'external-order.v1'
    });

    expect(inserted.status).toBe('INSERTED');
    await expect(
      repository.findRevision({
        tenantId: tenantA,
        connectionId: baseFact.connectionId,
        orderKey: baseFact.orderKey,
        revision: baseFact.revision
      })
    ).resolves.toMatchObject({ fact: { tenantId: tenantA } });
    await expect(
      repository.findRevision({
        tenantId: tenantB,
        connectionId: otherTenantFact.connectionId,
        orderKey: otherTenantFact.orderKey,
        revision: otherTenantFact.revision
      })
    ).resolves.toMatchObject({ fact: { tenantId: tenantB } });
  });

  it('enforces append-only history and composite tenant foreign keys in PostgreSQL', async () => {
    await expect(
      client.intelligenceChannelOrderFact.update({
        where: {
          tenantId_connectionId_orderKey_revision: {
            tenantId: tenantA,
            connectionId: baseFact.connectionId,
            orderKey: baseFact.orderKey,
            revision: new Date(baseFact.revision)
          }
        },
        data: { totalCents: 0 }
      })
    ).rejects.toThrow(/intelligence facts are immutable/);

    await expect(
      client.intelligenceChannelOrderLineFact.create({
        data: {
          tenantId: 'forged-tenant',
          connectionId: baseFact.connectionId,
          orderKey: baseFact.orderKey,
          revision: new Date(baseFact.revision),
          ordinal: 99,
          kind: 'ITEM',
          providerItemId: 'forged-item',
          name: 'Forged cross-tenant line',
          quantity: 1,
          unitPriceCents: 1,
          totalCents: 1
        }
      })
    ).rejects.toThrow();
  });

  it('rejects missing ingestion provenance before persistence', async () => {
    await expect(
      repository.append(baseFact, {
        receiptId: ' ',
        ingestionRunId: 'run-invalid',
        schemaVersion: 'external-order.v1'
      })
    ).rejects.toEqual(
      new ChannelOrderFactPersistenceError('INVALID_PROVENANCE', 'provenance.receiptId')
    );
  });
});

function fact(tenantId: string): ChannelOrderFact {
  return Object.freeze({
    tenantId,
    connectionId: 'anota-ai-primary',
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-santo-parma',
    orderKey: 'hmac-v1:stable-order-key',
    revision: '2026-07-29T21:00:00.000Z',
    currency: 'BRL',
    occurredAt: new Date('2026-07-29T20:50:00.000Z'),
    observedAt: new Date('2026-07-29T21:05:00.000Z'),
    salesChannel: 'DELIVERY',
    orderType: 'DELIVERY',
    menuVersion: 1,
    lines: Object.freeze([
      Object.freeze({
        kind: 'ITEM' as const,
        providerItemId: 'item-parmegiana',
        name: 'Parmegiana individual',
        quantity: 1,
        unitPriceCents: 4490,
        totalCents: 4490
      }),
      Object.freeze({
        kind: 'MODIFIER' as const,
        providerItemId: 'modifier-puree',
        parentProviderItemId: 'item-parmegiana',
        name: 'Purê',
        quantity: 1,
        unitPriceCents: 500,
        totalCents: 500
      })
    ]),
    adjustments: Object.freeze([
      Object.freeze({
        kind: 'DISCOUNT' as const,
        amountCents: 200,
        label: 'CUPOM'
      }),
      Object.freeze({
        kind: 'DELIVERY_FEE' as const,
        amountCents: 800,
        label: 'Delivery'
      })
    ]),
    totalCents: 5590
  });
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
