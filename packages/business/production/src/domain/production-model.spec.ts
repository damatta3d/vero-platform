import { InsufficientStockError } from '@vero/business-inventory';
import {
  InvalidProductionDataError,
  ProductionAuthorizationError,
  ProductionProductNotFoundError
} from './production-errors.js';
import { completeProduction, type ProductionPreparation } from './production-model.js';

const preparation: ProductionPreparation = {
  tenantId: 'santo-parma',
  productId: '10000000-0000-4000-8000-000000000001',
  productName: 'Parmegiana de Alcatra Individual',
  recipeId: '20000000-0000-4000-8000-000000000001',
  recipeVersion: 3,
  yieldUnits: 2,
  recipeLines: [
    {
      ingredientId: '30000000-0000-4000-8000-000000000001',
      recipeQuantityMicros: 300_000,
      catalogUnitCostMicros: 5_300_000_000
    },
    {
      ingredientId: '30000000-0000-4000-8000-000000000002',
      recipeQuantityMicros: 400_000,
      catalogUnitCostMicros: 400_000_000
    }
  ],
  stockPositions: [
    {
      tenantId: 'santo-parma',
      ingredientId: '30000000-0000-4000-8000-000000000001',
      quantityOnHandMicros: 10_000_000,
      averageUnitCostMicros: 5_000_000_000,
      inventoryValueCents: 50_000
    },
    {
      tenantId: 'santo-parma',
      ingredientId: '30000000-0000-4000-8000-000000000002',
      quantityOnHandMicros: 25_000_000,
      averageUnitCostMicros: 400_000_000,
      inventoryValueCents: 10_000
    }
  ]
};

const input = {
  id: '40000000-0000-4000-8000-000000000001',
  tenantId: 'santo-parma',
  idempotencyKey: '50000000-0000-4000-8000-000000000001',
  quantity: 2,
  movementIds: {
    '30000000-0000-4000-8000-000000000001': '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002': '60000000-0000-4000-8000-000000000002'
  },
  authoredBy: 'christian',
  producedAt: new Date('2026-07-28T23:30:00.000Z')
};

describe('completeProduction', () => {
  it('snapshots recipe, consumes stock and calculates estimated and realized production CMV', () => {
    const posting = completeProduction(preparation, input);

    expect(posting.production).toMatchObject({
      productName: 'Parmegiana de Alcatra Individual',
      recipeVersion: 3,
      yieldUnits: 2,
      quantity: 2,
      estimatedCmvCents: 1750,
      realizedCmvCents: 1660
    });
    expect(posting.stockPostings.map((item) => item.movement.quantityMicros)).toEqual([
      300_000, 400_000
    ]);
    expect(posting.stockPostings.every((item) => item.movement.type === 'CONSUMPTION_OUT')).toBe(
      true
    );
  });

  it('uses recipe yield and rejects the whole production on insufficient stock', () => {
    expect(
      completeProduction(preparation, { ...input, quantity: 1 }).stockPostings.map(
        (item) => item.movement.quantityMicros
      )
    ).toEqual([150_000, 200_000]);
    expect(() =>
      completeProduction(
        {
          ...preparation,
          stockPositions: preparation.stockPositions.map((position, index) =>
            index === 0 ? { ...position, quantityOnHandMicros: 1 } : position
          )
        },
        input
      )
    ).toThrow(InsufficientStockError);
  });

  it.each([
    [{ ...preparation, tenantId: 'another-tenant' }, input, 'tenantId'],
    [{ ...preparation, recipeLines: [] }, input, 'recipeLines'],
    [preparation, { ...input, quantity: 0 }, 'quantity'],
    [preparation, { ...input, producedAt: new Date('invalid') }, 'producedAt'],
    [
      { ...preparation, stockPositions: preparation.stockPositions.slice(1) },
      input,
      'stockPosition'
    ],
    [
      {
        ...preparation,
        recipeLines: [{ ...preparation.recipeLines[0]!, catalogUnitCostMicros: -1 }]
      },
      input,
      'catalogUnitCostMicros'
    ]
  ])('rejects invalid production boundary data %#', (candidate, candidateInput, field) => {
    expect(() => completeProduction(candidate, candidateInput)).toThrow(
      new InvalidProductionDataError(field)
    );
  });

  it('exposes stable domain error messages', () => {
    expect(new ProductionProductNotFoundError().message).toContain('not found');
    expect(new ProductionAuthorizationError().message).toContain('does not authorize');
  });
});
