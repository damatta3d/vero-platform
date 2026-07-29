import {
  calculateRecipeCost,
  createIngredient,
  createProduct,
  createRecipe,
  type CatalogItemKind
} from './catalog-model.js';
import { CatalogTenantMismatchError, InvalidCatalogDataError } from './catalog-errors.js';

const now = new Date('2026-07-28T12:00:00.000Z');

describe('catalog domain', () => {
  it('calculates the Parmegiana de Alcatra cost and margin deterministically', () => {
    const product = createProduct({
      id: 'parmegiana-alcatra',
      tenantId: 'santo-parma',
      name: 'Parmegiana de Alcatra',
      salePriceCents: 4490,
      createdAt: now,
      updatedAt: now
    });
    const ingredients = [
      createIngredient({
        id: 'alcatra',
        tenantId: 'santo-parma',
        name: 'Alcatra',
        unit: 'KILOGRAM',
        packageQuantityMicros: 1_000_000,
        packageCostCents: 5300,
        createdAt: now,
        updatedAt: now
      }),
      createIngredient({
        id: 'mucarela',
        tenantId: 'santo-parma',
        name: 'Muçarela',
        unit: 'KILOGRAM',
        packageQuantityMicros: 1_000_000,
        packageCostCents: 4000,
        createdAt: now,
        updatedAt: now
      }),
      createIngredient({
        id: 'hm05f',
        tenantId: 'santo-parma',
        name: 'HM05F',
        kind: 'PACKAGING',
        unit: 'UNIT',
        packageQuantityMicros: 100_000_000,
        packageCostCents: 5000,
        createdAt: now,
        updatedAt: now
      })
    ];
    const recipe = createRecipe({
      id: 'recipe-1',
      tenantId: 'santo-parma',
      productId: product.id,
      version: 1,
      yieldUnits: 1,
      lines: [
        { ingredientId: 'alcatra', quantityMicros: 150_000 },
        { ingredientId: 'mucarela', quantityMicros: 70_000 },
        { ingredientId: 'hm05f', quantityMicros: 1_000_000 }
      ],
      authoredBy: 'vero:christian',
      createdAt: now
    });

    expect(calculateRecipeCost(product, recipe, ingredients)).toEqual({
      totalCostCents: 1125,
      costPerUnitCents: 1125,
      salePriceCents: 4490,
      marginCents: 3365,
      marginBasisPoints: 7494
    });
  });

  it('classifies packaging separately while keeping old ingredient inputs compatible', () => {
    const ingredient = createIngredient({
      id: 'alcatra',
      tenantId: 'santo-parma',
      name: 'Alcatra',
      unit: 'KILOGRAM',
      packageQuantityMicros: 1_000_000,
      packageCostCents: 5300,
      createdAt: now,
      updatedAt: now
    });
    const packaging = createIngredient({
      id: 'mc500',
      tenantId: 'santo-parma',
      name: 'MC500',
      kind: 'PACKAGING',
      unit: 'UNIT',
      packageQuantityMicros: 100_000_000,
      packageCostCents: 5000,
      createdAt: now,
      updatedAt: now
    });

    expect(ingredient.kind).toBe('INGREDIENT');
    expect(packaging.kind).toBe('PACKAGING');
  });

  it('rejects invalid quantities, duplicate recipe lines and cross-tenant data', () => {
    expect(() =>
      createIngredient({
        id: 'a',
        tenantId: 'tenant-a',
        name: 'Alcatra',
        unit: 'KILOGRAM',
        packageQuantityMicros: 0,
        packageCostCents: 5300,
        createdAt: now,
        updatedAt: now
      })
    ).toThrow(InvalidCatalogDataError);
    expect(() =>
      createIngredient({
        id: 'packaging',
        tenantId: 'tenant-a',
        name: 'HM05F',
        kind: 'INVALID' as CatalogItemKind,
        unit: 'UNIT',
        packageQuantityMicros: 1_000_000,
        packageCostCents: 50,
        createdAt: now,
        updatedAt: now
      })
    ).toThrow(InvalidCatalogDataError);
    expect(() =>
      createRecipe({
        id: 'r',
        tenantId: 'tenant-a',
        productId: 'p',
        version: 1,
        yieldUnits: 1,
        lines: [
          { ingredientId: 'i', quantityMicros: 1 },
          { ingredientId: 'i', quantityMicros: 2 }
        ],
        authoredBy: 'vero:user',
        createdAt: now
      })
    ).toThrow(InvalidCatalogDataError);

    const product = createProduct({
      id: 'p',
      tenantId: 'tenant-a',
      name: 'P',
      salePriceCents: 100,
      createdAt: now,
      updatedAt: now
    });
    const recipe = createRecipe({
      id: 'r',
      tenantId: 'tenant-b',
      productId: 'p',
      version: 1,
      yieldUnits: 1,
      lines: [{ ingredientId: 'i', quantityMicros: 1 }],
      authoredBy: 'vero:user',
      createdAt: now
    });
    expect(() => calculateRecipeCost(product, recipe, [])).toThrow(CatalogTenantMismatchError);
  });
});
