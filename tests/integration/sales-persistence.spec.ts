import { createIngredient, createProduct, createRecipe } from '@vero/business-catalog';
import { createStockPosting } from '@vero/business-inventory';
import { completeSale } from '@vero/business-sales';
import {
  createDatabaseClient,
  PrismaCatalogRepository,
  PrismaInventoryRepository,
  PrismaSalesRepository
} from '@vero/infrastructure-database';

describe('sales persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL'));
  const catalog = new PrismaCatalogRepository(client);
  const inventory = new PrismaInventoryRepository(client);
  const sales = new PrismaSalesRepository(client);
  const tenantId = 'santo-parma-sales';
  const otherTenant = 'other-restaurant-sales';
  const productId = '71000000-0000-4000-8000-000000000001';
  const recipeId = '72000000-0000-4000-8000-000000000001';
  const ingredientId = '73000000-0000-4000-8000-000000000001';
  const saleId = '74000000-0000-4000-8000-000000000001';
  const movementId = '75000000-0000-4000-8000-000000000001';
  const idempotencyKey = '76000000-0000-4000-8000-000000000001';
  const now = new Date('2026-07-28T23:00:00.000Z');

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
        id: '77000000-0000-4000-8000-000000000001',
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

  it('persists sale snapshot and inventory consumption atomically', async () => {
    const decide = (preparation: Parameters<typeof completeSale>[0]) =>
      completeSale(preparation, {
        id: saleId,
        tenantId,
        idempotencyKey,
        quantity: 2,
        movementIds: { [ingredientId]: movementId },
        authoredBy: 'vero:integration',
        soldAt: now
      });

    const first = await sales.transact(tenantId, productId, idempotencyKey, decide);
    const repeated = await sales.transact(tenantId, productId, idempotencyKey, decide);

    expect(first).toMatchObject({
      recipeId,
      recipeVersion: 1,
      quantity: 2,
      grossRevenueCents: 8980,
      estimatedCmvCents: 1590,
      realizedCmvCents: 1500,
      marginCents: 7480
    });
    expect(repeated.id).toBe(first.id);
    await expect(inventory.findPosition(tenantId, ingredientId)).resolves.toMatchObject({
      quantityOnHandMicros: 9_700_000
    });
    await expect(inventory.listMovements(tenantId, ingredientId, 10)).resolves.toHaveLength(2);
    await expect(sales.listSales(otherTenant, 10)).resolves.toHaveLength(0);
  });

  it('keeps completed sales immutable and summarizes realized margin', async () => {
    await expect(
      client.salesRecord.update({
        where: { tenantId_id: { tenantId, id: saleId } },
        data: { marginCents: 0 }
      })
    ).rejects.toThrow(/sales history is immutable/);

    await expect(sales.summarize(tenantId)).resolves.toMatchObject({
      salesCount: 1,
      unitsSold: 2,
      grossRevenueCents: 8980,
      realizedCmvCents: 1500,
      marginCents: 7480
    });
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
