import { createIngredient, createProduct, createRecipe } from '@vero/business-catalog';
import { createStockPosting } from '@vero/business-inventory';
import { completeProduction } from '@vero/business-production';
import {
  createDatabaseClient,
  PrismaCatalogRepository,
  PrismaInventoryRepository,
  PrismaProductionRepository
} from '@vero/infrastructure-database';

describe('production persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL'));
  const catalog = new PrismaCatalogRepository(client);
  const inventory = new PrismaInventoryRepository(client);
  const production = new PrismaProductionRepository(client);
  const tenantId = 'santo-parma-production';
  const otherTenant = 'other-restaurant-production';
  const productId = '81000000-0000-4000-8000-000000000001';
  const recipeId = '82000000-0000-4000-8000-000000000001';
  const ingredientId = '83000000-0000-4000-8000-000000000001';
  const productionId = '84000000-0000-4000-8000-000000000001';
  const movementId = '85000000-0000-4000-8000-000000000001';
  const idempotencyKey = '86000000-0000-4000-8000-000000000001';
  const now = new Date('2026-07-28T23:45:00.000Z');

  beforeAll(async () => {
    await catalog.saveIngredient(
      createIngredient({
        id: ingredientId,
        tenantId,
        name: 'Alcatra',
        unit: 'KILOGRAM',
        packageQuantityMicros: 1_000_000,
        packageCostCents: 5300,
        createdAt: now,
        updatedAt: now
      })
    );
    await catalog.saveProduct(
      createProduct({
        id: productId,
        tenantId,
        name: 'Parmegiana de Alcatra Individual',
        salePriceCents: 4490,
        createdAt: now,
        updatedAt: now
      })
    );
    await catalog.saveRecipe(
      createRecipe({
        id: recipeId,
        tenantId,
        productId,
        version: 1,
        yieldUnits: 1,
        lines: [{ ingredientId, quantityMicros: 150_000 }],
        authoredBy: 'vero:integration',
        createdAt: now
      })
    );
    await inventory.transact(tenantId, ingredientId, (position) =>
      createStockPosting(position, {
        id: '87000000-0000-4000-8000-000000000001',
        tenantId,
        ingredientId,
        type: 'PURCHASE_IN',
        quantityMicros: 10_000_000,
        totalCostCents: 50_000,
        reason: 'Estoque inicial',
        authoredBy: 'vero:integration',
        occurredAt: now
      })
    );
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('persists production snapshot and inventory consumption atomically and idempotently', async () => {
    const decide = (preparation: Parameters<typeof completeProduction>[0]) =>
      completeProduction(preparation, {
        id: productionId,
        tenantId,
        idempotencyKey,
        quantity: 2,
        movementIds: { [ingredientId]: movementId },
        authoredBy: 'vero:integration',
        producedAt: now
      });

    const first = await production.transact(tenantId, productId, idempotencyKey, decide);
    const repeated = await production.transact(tenantId, productId, idempotencyKey, decide);

    expect(first).toMatchObject({
      recipeId,
      recipeVersion: 1,
      yieldUnits: 1,
      quantity: 2,
      estimatedCmvCents: 1590,
      realizedCmvCents: 1500
    });
    expect(repeated.id).toBe(first.id);
    await expect(inventory.findPosition(tenantId, ingredientId)).resolves.toMatchObject({
      quantityOnHandMicros: 9_700_000
    });
    await expect(inventory.listMovements(tenantId, ingredientId, 10)).resolves.toHaveLength(2);
    await expect(production.listProduction(otherTenant, 10)).resolves.toHaveLength(0);
  });

  it('keeps production immutable and summarizes realized production CMV', async () => {
    await expect(
      client.productionRecord.update({
        where: { tenantId_id: { tenantId, id: productionId } },
        data: { realizedCmvCents: 0 }
      })
    ).rejects.toThrow(/production history is immutable/);

    await expect(production.summarize(tenantId)).resolves.toMatchObject({
      productionCount: 1,
      unitsProduced: 2,
      estimatedCmvCents: 1590,
      realizedCmvCents: 1500
    });
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
