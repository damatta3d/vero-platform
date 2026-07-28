import { createIngredient, createProduct, createRecipe } from '@vero/business-catalog';
import { createDatabaseClient, PrismaCatalogRepository } from '@vero/infrastructure-database';

describe('catalog persistence', () => {
  const databaseUrl = required('VERO_DATABASE_URL');
  const client = createDatabaseClient(databaseUrl);
  const repository = new PrismaCatalogRepository(client);
  const now = new Date('2026-07-28T18:00:00.000Z');
  const tenantA = 'santo-parma-integration';
  const tenantB = 'other-restaurant-integration';

  afterAll(async () => {
    await client.$disconnect();
  });

  it('persists a recipe and keeps every query inside its tenant', async () => {
    const ingredient = createIngredient({
      id: '10000000-0000-4000-8000-000000000001',
      tenantId: tenantA,
      name: 'Alcatra',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 5300,
      createdAt: now,
      updatedAt: now
    });
    const product = createProduct({
      id: '20000000-0000-4000-8000-000000000001',
      tenantId: tenantA,
      name: 'Parmegiana de Alcatra',
      salePriceCents: 4490,
      createdAt: now,
      updatedAt: now
    });
    const recipe = createRecipe({
      id: '30000000-0000-4000-8000-000000000001',
      tenantId: tenantA,
      productId: product.id,
      version: 1,
      yieldUnits: 1,
      lines: [{ ingredientId: ingredient.id, quantityMicros: 150_000 }],
      authoredBy: 'vero:integration',
      createdAt: now
    });

    await repository.saveIngredient(ingredient);
    await repository.saveProduct(product);
    await repository.saveRecipe(recipe);

    await expect(repository.findLatestRecipe(tenantA, product.id)).resolves.toEqual(recipe);
    await expect(repository.findProduct(tenantB, product.id)).resolves.toBeUndefined();
    await expect(repository.findIngredients(tenantB, [ingredient.id])).resolves.toEqual([]);
  });

  it('rejects a recipe relation that attempts to cross tenants', async () => {
    const forgedCrossTenantRecipe = createRecipe({
      id: '30000000-0000-4000-8000-000000000002',
      tenantId: tenantB,
      productId: '20000000-0000-4000-8000-000000000001',
      version: 1,
      yieldUnits: 1,
      lines: [
        {
          ingredientId: '10000000-0000-4000-8000-000000000001',
          quantityMicros: 150_000
        }
      ],
      authoredBy: 'vero:integration',
      createdAt: now
    });

    await expect(repository.saveRecipe(forgedCrossTenantRecipe)).rejects.toThrow();
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
