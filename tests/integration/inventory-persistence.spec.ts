import { createIngredient } from '@vero/business-catalog';
import { createStockPosting } from '@vero/business-inventory';
import {
  createDatabaseClient,
  PrismaCatalogRepository,
  PrismaInventoryRepository
} from '@vero/infrastructure-database';

describe('inventory persistence', () => {
  const databaseUrl = required('VERO_DATABASE_URL');
  const client = createDatabaseClient(databaseUrl);
  const catalog = new PrismaCatalogRepository(client);
  const inventory = new PrismaInventoryRepository(client);
  const now = new Date('2026-07-28T21:00:00.000Z');
  const tenantA = 'santo-parma-inventory';
  const tenantB = 'other-restaurant-inventory';
  const ingredientId = '40000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    await catalog.saveIngredient(
      createIngredient({
        id: ingredientId,
        tenantId: tenantA,
        name: 'Batata Asterix',
        unit: 'KILOGRAM',
        packageQuantityMicros: 25_000_000,
        packageCostCents: 10_000,
        createdAt: now,
        updatedAt: now
      })
    );
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('atomically appends purchases and projects tenant stock with moving average', async () => {
    const first = await inventory.transact(tenantA, ingredientId, (current) =>
      createStockPosting(current, {
        id: '50000000-0000-4000-8000-000000000001',
        tenantId: tenantA,
        ingredientId,
        type: 'PURCHASE_IN',
        quantityMicros: 25_000_000,
        totalCostCents: 10_000,
        reason: 'Compra CEASA',
        authoredBy: 'vero:integration',
        occurredAt: now
      })
    );
    const second = await inventory.transact(tenantA, ingredientId, (current) =>
      createStockPosting(current, {
        id: '50000000-0000-4000-8000-000000000002',
        tenantId: tenantA,
        ingredientId,
        type: 'PURCHASE_IN',
        quantityMicros: 10_000_000,
        totalCostCents: 5000,
        reason: 'Reposição',
        authoredBy: 'vero:integration',
        occurredAt: new Date(now.getTime() + 1000)
      })
    );

    expect(first.position.inventoryValueCents).toBe(10_000);
    expect(second.position).toMatchObject({
      tenantId: tenantA,
      quantityOnHandMicros: 35_000_000,
      averageUnitCostMicros: 428_571_429,
      inventoryValueCents: 15_000
    });
    await expect(inventory.findPosition(tenantB, ingredientId)).resolves.toBeUndefined();
    await expect(inventory.listMovements(tenantA, ingredientId, 10)).resolves.toHaveLength(2);
  });

  it('rejects cross-tenant stock and database ledger mutation', async () => {
    await expect(
      inventory.transact(tenantB, ingredientId, (current) =>
        createStockPosting(current, {
          id: '50000000-0000-4000-8000-000000000003',
          tenantId: tenantB,
          ingredientId,
          type: 'PURCHASE_IN',
          quantityMicros: 1_000_000,
          totalCostCents: 400,
          reason: 'Cross tenant',
          authoredBy: 'vero:integration',
          occurredAt: now
        })
      )
    ).rejects.toThrow();

    await expect(
      client.inventoryStockMovement.update({
        where: {
          tenantId_id: {
            tenantId: tenantA,
            id: '50000000-0000-4000-8000-000000000001'
          }
        },
        data: { reason: 'Tentativa de reescrita' }
      })
    ).rejects.toThrow(/immutable ledger/);
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
