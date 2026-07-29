/* Test-only owner fixtures create the trusted security contexts exercised by this module. */
/* eslint-disable @nx/enforce-module-boundaries */
import { promoteVerifiedSubject } from '../../../../core/identity/src/internal/trusted-authentication.js';
import { requireTrustedAuthenticationResult } from '../../../../core/identity/src/application/authenticator.js';
import { createTenantIdFromTrustedValue } from '../../../../core/tenancy/src/domain/tenant-id.js';
import { createResolvedTenantContext } from '../../../../core/tenancy/src/application/resolved-tenant-context.js';
import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AuthorizedAccessContext
} from '@vero/core-access';
import type { Ingredient, Product, Recipe } from '../domain/catalog-model.js';
import { CatalogAuthorizationError, CatalogItemNotFoundError } from '../domain/catalog-errors.js';
import type { CatalogRepository } from './catalog-repository.js';
import { CatalogService } from './catalog-service.js';

class MemoryCatalogRepository implements CatalogRepository {
  readonly ingredients: Ingredient[] = [];
  readonly products: Product[] = [];
  readonly recipes: Recipe[] = [];

  saveIngredient(ingredient: Ingredient): Promise<void> {
    this.ingredients.push(ingredient);
    return Promise.resolve();
  }

  saveProduct(product: Product): Promise<void> {
    this.products.push(product);
    return Promise.resolve();
  }

  saveRecipe(recipe: Recipe): Promise<void> {
    this.recipes.push(recipe);
    return Promise.resolve();
  }

  findIngredient(tenantId: string, ingredientId: string): Promise<Ingredient | undefined> {
    return Promise.resolve(
      this.ingredients.find(
        (ingredient) => ingredient.tenantId === tenantId && ingredient.id === ingredientId
      )
    );
  }

  findIngredients(tenantId: string, ingredientIds: readonly string[]): Promise<Ingredient[]> {
    return Promise.resolve(
      this.ingredients.filter(
        (ingredient) => ingredient.tenantId === tenantId && ingredientIds.includes(ingredient.id)
      )
    );
  }

  findProduct(tenantId: string, productId: string): Promise<Product | undefined> {
    return Promise.resolve(
      this.products.find((product) => product.tenantId === tenantId && product.id === productId)
    );
  }

  findLatestRecipe(tenantId: string, productId: string): Promise<Recipe | undefined> {
    return Promise.resolve(
      this.recipes
        .filter((recipe) => recipe.tenantId === tenantId && recipe.productId === productId)
        .sort((left, right) => right.version - left.version)[0]
    );
  }

  listIngredients(tenantId: string): Promise<Ingredient[]> {
    return Promise.resolve(
      this.ingredients.filter((ingredient) => ingredient.tenantId === tenantId)
    );
  }

  listProducts(tenantId: string): Promise<Product[]> {
    return Promise.resolve(this.products.filter((product) => product.tenantId === tenantId));
  }
}

function trustedRequest(action: string, tenantId = 'santo-parma') {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'christian', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return {
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue(tenantId)),
    action: actionRef(action),
    resource: resourceRef('catalog.management')
  };
}

async function access(action: string, tenantId?: string): Promise<AuthorizedAccessContext> {
  return createAccessAuthorizer({
    evaluate: () =>
      Promise.resolve({ outcome: 'allow', reason: 'mvp-owner', policyRevision: 'mvp-v1' })
  }).authorize(trustedRequest(action, tenantId));
}

describe(CatalogService.name, () => {
  const now = new Date('2026-07-28T12:00:00.000Z');
  let sequence = 0;
  let repository: MemoryCatalogRepository;
  let service: CatalogService;

  beforeEach(() => {
    sequence = 0;
    repository = new MemoryCatalogRepository();
    service = new CatalogService(
      repository,
      { generate: () => `id-${++sequence}` },
      { now: () => now }
    );
  });

  it('creates the first usable Santo Parma catalog and calculates its current cost', async () => {
    const alcatra = await service.createIngredient(await access('catalog.ingredient.create'), {
      name: 'Alcatra',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 5300
    });
    const cheese = await service.createIngredient(await access('catalog.ingredient.create'), {
      name: 'Muçarela',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 4000
    });
    const packaging = await service.createIngredient(await access('catalog.ingredient.create'), {
      name: 'HM05F',
      kind: 'PACKAGING',
      unit: 'UNIT',
      packageQuantityMicros: 100_000_000,
      packageCostCents: 5000
    });
    const product = await service.createProduct(await access('catalog.product.create'), {
      name: 'Parmegiana de Alcatra',
      salePriceCents: 4490
    });
    const recipe = await service.saveRecipe(await access('catalog.recipe.save'), {
      productId: product.id,
      yieldUnits: 1,
      lines: [
        { ingredientId: alcatra.id, quantityMicros: 150_000 },
        { ingredientId: cheese.id, quantityMicros: 70_000 },
        { ingredientId: packaging.id, quantityMicros: 1_000_000 }
      ]
    });

    expect(recipe.version).toBe(1);
    expect(await service.getProductCost(await access('catalog.cost.read'), product.id)).toEqual({
      totalCostCents: 1125,
      costPerUnitCents: 1125,
      salePriceCents: 4490,
      marginCents: 3365,
      marginBasisPoints: 7494
    });
    const items = await service.listIngredients(await access('catalog.ingredient.read'));
    expect(items).toHaveLength(3);
    expect(items.find((item) => item.name === 'HM05F')?.kind).toBe('PACKAGING');
    expect(await service.listProducts(await access('catalog.product.read'))).toHaveLength(1);
  });

  it('denies a context authorized for another operation', async () => {
    await expect(
      service.createProduct(await access('catalog.product.read'), {
        name: 'Parmegiana',
        salePriceCents: 4490
      })
    ).rejects.toThrow(CatalogAuthorizationError);
  });

  it('does not build recipes from missing products or ingredients', async () => {
    await expect(
      service.saveRecipe(await access('catalog.recipe.save'), {
        productId: 'missing',
        yieldUnits: 1,
        lines: [{ ingredientId: 'missing', quantityMicros: 1 }]
      })
    ).rejects.toThrow(CatalogItemNotFoundError);

    const product = await service.createProduct(await access('catalog.product.create'), {
      name: 'Parmegiana',
      salePriceCents: 4490
    });
    await expect(
      service.saveRecipe(await access('catalog.recipe.save'), {
        productId: product.id,
        yieldUnits: 1,
        lines: [{ ingredientId: 'missing', quantityMicros: 1 }]
      })
    ).rejects.toThrow(CatalogItemNotFoundError);
  });

  it('isolates listings by tenant', async () => {
    await service.createIngredient(await access('catalog.ingredient.create', 'tenant-a'), {
      name: 'Alcatra A',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 5300
    });
    await service.createIngredient(await access('catalog.ingredient.create', 'tenant-b'), {
      name: 'Alcatra B',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 5400
    });

    const tenantA = await service.listIngredients(
      await access('catalog.ingredient.read', 'tenant-a')
    );
    expect(tenantA.map((ingredient) => ingredient.name)).toEqual(['Alcatra A']);
  });
});
