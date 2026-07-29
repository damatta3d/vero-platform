import { completeSale, type SalePreparation } from './sales-model.js';
import { InsufficientStockError } from '@vero/business-inventory';
import {
  InvalidSaleDataError,
  SaleProductNotFoundError,
  SalesAuthorizationError
} from './sales-errors.js';

const preparation: SalePreparation = {
  tenantId: 'santo-parma',
  productId: '10000000-0000-4000-8000-000000000001',
  productName: 'Parmegiana de Alcatra Individual',
  recipeId: '20000000-0000-4000-8000-000000000001',
  recipeVersion: 3,
  yieldUnits: 2,
  unitSalePriceCents: 4490,
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
  soldAt: new Date('2026-07-28T23:00:00.000Z')
};

describe('completeSale', () => {
  it('snapshots recipe, consumes stock and calculates realized CMV and margin', () => {
    const posting = completeSale(preparation, input);

    expect(posting.sale).toMatchObject({
      productName: 'Parmegiana de Alcatra Individual',
      recipeVersion: 3,
      quantity: 2,
      grossRevenueCents: 8980,
      estimatedCmvCents: 1750,
      realizedCmvCents: 1660,
      marginCents: 7320,
      marginBasisPoints: 8151
    });
    expect(posting.stockPostings.map((item) => item.movement.quantityMicros)).toEqual([
      300_000, 400_000
    ]);
    expect(posting.stockPostings.map((item) => item.movement.type)).toEqual([
      'CONSUMPTION_OUT',
      'CONSUMPTION_OUT'
    ]);
  });

  it('uses recipe yield when selling one unit', () => {
    const posting = completeSale(preparation, { ...input, quantity: 1 });
    expect(posting.stockPostings.map((item) => item.movement.quantityMicros)).toEqual([
      150_000, 200_000
    ]);
  });

  it('rejects the whole sale if any ingredient has insufficient stock', () => {
    const insufficient = {
      ...preparation,
      stockPositions: preparation.stockPositions.map((position, index) =>
        index === 0 ? { ...position, quantityOnHandMicros: 1 } : position
      )
    };
    expect(() => completeSale(insufficient, input)).toThrow(InsufficientStockError);
  });

  it.each([
    [{ ...preparation, tenantId: 'another-tenant' }, input, 'tenantId'],
    [{ ...preparation, recipeLines: [] }, input, 'recipeLines'],
    [preparation, { ...input, quantity: 0 }, 'quantity'],
    [preparation, { ...input, soldAt: new Date('invalid') }, 'soldAt'],
    [
      { ...preparation, stockPositions: preparation.stockPositions.slice(1) },
      input,
      'stockPosition'
    ],
    [
      preparation,
      {
        ...input,
        movementIds: {
          '30000000-0000-4000-8000-000000000002': '60000000-0000-4000-8000-000000000002'
        }
      },
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
  ])('rejects invalid sale boundary data %#', (candidate, candidateInput, field) => {
    expect(() => completeSale(candidate, candidateInput)).toThrow(new InvalidSaleDataError(field));
  });

  it('exposes stable domain error messages', () => {
    expect(new SaleProductNotFoundError().message).toContain('active recipe');
    expect(new SalesAuthorizationError().message).toContain('not authorized');
  });
});
