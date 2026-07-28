import { InsufficientStockError, InvalidInventoryDataError } from './inventory-errors.js';
import { createStockPosting, emptyStockPosition } from './inventory-model.js';

describe('inventory model', () => {
  const at = new Date('2026-07-28T20:00:00.000Z');
  const base = {
    id: 'movement-1',
    tenantId: 'santo-parma',
    ingredientId: 'batata',
    reason: 'NF 123',
    authoredBy: 'christian',
    occurredAt: at
  };

  it('calculates moving average across purchase entries without losing fractional cost', () => {
    const first = createStockPosting(emptyStockPosition('santo-parma', 'batata'), {
      ...base,
      type: 'PURCHASE_IN',
      quantityMicros: 25_000_000,
      totalCostCents: 10_000
    });
    const second = createStockPosting(first.position, {
      ...base,
      id: 'movement-2',
      type: 'PURCHASE_IN',
      quantityMicros: 10_000_000,
      totalCostCents: 5000
    });

    expect(first.position).toMatchObject({
      quantityOnHandMicros: 25_000_000,
      averageUnitCostMicros: 400_000_000,
      inventoryValueCents: 10_000
    });
    expect(second.position).toMatchObject({
      quantityOnHandMicros: 35_000_000,
      averageUnitCostMicros: 428_571_429,
      inventoryValueCents: 15_000
    });
  });

  it('snapshots consumption cost and keeps the average for remaining stock', () => {
    const purchase = createStockPosting(emptyStockPosition('santo-parma', 'alcatra'), {
      ...base,
      ingredientId: 'alcatra',
      type: 'PURCHASE_IN',
      quantityMicros: 10_000_000,
      totalCostCents: 53_000
    });
    const consumption = createStockPosting(purchase.position, {
      ...base,
      id: 'movement-2',
      ingredientId: 'alcatra',
      type: 'CONSUMPTION_OUT',
      quantityMicros: 150_000,
      reason: 'Parmegiana de Alcatra'
    });

    expect(consumption.movement).toMatchObject({
      unitCostMicros: 5_300_000_000,
      totalCostCents: 795
    });
    expect(consumption.position).toMatchObject({
      quantityOnHandMicros: 9_850_000,
      averageUnitCostMicros: 5_300_000_000,
      inventoryValueCents: 52_205
    });
  });

  it('prevents negative stock and requires cost for inbound adjustments', () => {
    expect(() =>
      createStockPosting(emptyStockPosition('santo-parma', 'alcatra'), {
        ...base,
        ingredientId: 'alcatra',
        type: 'CONSUMPTION_OUT',
        quantityMicros: 1
      })
    ).toThrow(InsufficientStockError);

    expect(() =>
      createStockPosting(emptyStockPosition('santo-parma', 'alcatra'), {
        ...base,
        ingredientId: 'alcatra',
        type: 'ADJUSTMENT_IN',
        quantityMicros: 1
      })
    ).toThrow(InvalidInventoryDataError);
  });

  it('resets average cost when an outbound adjustment empties stock', () => {
    const purchase = createStockPosting(emptyStockPosition('santo-parma', 'batata'), {
      ...base,
      type: 'PURCHASE_IN',
      quantityMicros: 1_000_000,
      totalCostCents: 400
    });
    const adjustment = createStockPosting(purchase.position, {
      ...base,
      id: 'movement-2',
      type: 'ADJUSTMENT_OUT',
      quantityMicros: 1_000_000,
      reason: 'Perda operacional'
    });

    expect(adjustment.position).toMatchObject({
      quantityOnHandMicros: 0,
      averageUnitCostMicros: 0,
      inventoryValueCents: 0
    });
  });

  it('rejects malformed quantities, identity, reasons and dates', () => {
    const current = emptyStockPosition('santo-parma', 'batata');
    expect(() =>
      createStockPosting(current, {
        ...base,
        type: 'PURCHASE_IN',
        quantityMicros: 0,
        totalCostCents: 400
      })
    ).toThrow(InvalidInventoryDataError);
    expect(() =>
      createStockPosting(current, {
        ...base,
        type: 'PURCHASE_IN',
        quantityMicros: 1_000_000,
        totalCostCents: 0
      })
    ).toThrow(InvalidInventoryDataError);
    expect(() =>
      createStockPosting(current, {
        ...base,
        type: 'PURCHASE_IN',
        quantityMicros: 1_000_000,
        totalCostCents: 400,
        reason: ' '
      })
    ).toThrow(InvalidInventoryDataError);
    expect(() =>
      createStockPosting(current, {
        ...base,
        type: 'PURCHASE_IN',
        quantityMicros: 1_000_000,
        totalCostCents: 400,
        occurredAt: new Date('invalid')
      })
    ).toThrow(InvalidInventoryDataError);
  });
});
