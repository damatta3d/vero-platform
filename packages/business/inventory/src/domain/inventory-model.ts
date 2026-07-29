import { InsufficientStockError, InvalidInventoryDataError } from './inventory-errors.js';

const MICRO_SCALE = 1_000_000n;
const COST_SCALE = MICRO_SCALE * MICRO_SCALE;

export const stockMovementTypeValues = [
  'PURCHASE_IN',
  'CONSUMPTION_OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT'
] as const;
export type StockMovementType = (typeof stockMovementTypeValues)[number];

export interface StockPosition {
  readonly tenantId: string;
  readonly ingredientId: string;
  readonly quantityOnHandMicros: number;
  readonly averageUnitCostMicros: number;
  readonly inventoryValueCents: number;
  readonly lastMovementAt?: Date;
}

export interface StockMovement {
  readonly id: string;
  readonly tenantId: string;
  readonly ingredientId: string;
  readonly type: StockMovementType;
  readonly quantityMicros: number;
  readonly unitCostMicros: number;
  readonly totalCostCents: number;
  readonly reason: string;
  readonly authoredBy: string;
  readonly occurredAt: Date;
}

export interface StockPosting {
  readonly movement: StockMovement;
  readonly position: StockPosition;
}

export interface CreateStockPostingInput {
  readonly id: string;
  readonly tenantId: string;
  readonly ingredientId: string;
  readonly type: StockMovementType;
  readonly quantityMicros: number;
  readonly totalCostCents?: number;
  readonly reason: string;
  readonly authoredBy: string;
  readonly occurredAt: Date;
}

function requiredText(value: string, field: string, maximum = 256): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new InvalidInventoryDataError(field);
  }
  return normalized;
}

function positiveSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidInventoryDataError(field);
  return value;
}

function safeNumber(value: bigint, field: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new InvalidInventoryDataError(field);
  return converted;
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function emptyStockPosition(tenantId: string, ingredientId: string): StockPosition {
  return Object.freeze({
    tenantId: requiredText(tenantId, 'tenantId', 128),
    ingredientId: requiredText(ingredientId, 'ingredientId', 160),
    quantityOnHandMicros: 0,
    averageUnitCostMicros: 0,
    inventoryValueCents: 0
  });
}

export function createStockPosting(
  current: StockPosition,
  input: CreateStockPostingInput
): StockPosting {
  if (
    current.tenantId !== input.tenantId ||
    current.ingredientId !== input.ingredientId ||
    !stockMovementTypeValues.includes(input.type)
  ) {
    throw new InvalidInventoryDataError('stockPosition');
  }

  const quantityMicros = positiveSafeInteger(input.quantityMicros, 'quantityMicros');
  const isInbound = input.type === 'PURCHASE_IN' || input.type === 'ADJUSTMENT_IN';
  let quantityOnHandMicros: number;
  let averageUnitCostMicros: number;
  let totalCostCents: number;
  let unitCostMicros: number;

  if (isInbound) {
    totalCostCents = positiveSafeInteger(input.totalCostCents ?? 0, 'totalCostCents');
    unitCostMicros = safeNumber(
      roundedRatio(BigInt(totalCostCents) * COST_SCALE, BigInt(quantityMicros)),
      'unitCostMicros'
    );
    quantityOnHandMicros = safeNumber(
      BigInt(current.quantityOnHandMicros) + BigInt(quantityMicros),
      'quantityOnHandMicros'
    );
    averageUnitCostMicros = safeNumber(
      roundedRatio(
        BigInt(current.quantityOnHandMicros) * BigInt(current.averageUnitCostMicros) +
          BigInt(quantityMicros) * BigInt(unitCostMicros),
        BigInt(quantityOnHandMicros)
      ),
      'averageUnitCostMicros'
    );
  } else {
    if (quantityMicros > current.quantityOnHandMicros) throw new InsufficientStockError();
    quantityOnHandMicros = current.quantityOnHandMicros - quantityMicros;
    unitCostMicros = current.averageUnitCostMicros;
    totalCostCents = safeNumber(
      roundedRatio(BigInt(quantityMicros) * BigInt(unitCostMicros), COST_SCALE),
      'totalCostCents'
    );
    averageUnitCostMicros = quantityOnHandMicros === 0 ? 0 : current.averageUnitCostMicros;
  }

  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new InvalidInventoryDataError('occurredAt');
  const movement = Object.freeze({
    id: requiredText(input.id, 'movementId', 160),
    tenantId: requiredText(input.tenantId, 'tenantId', 128),
    ingredientId: requiredText(input.ingredientId, 'ingredientId', 160),
    type: input.type,
    quantityMicros,
    unitCostMicros,
    totalCostCents,
    reason: requiredText(input.reason, 'reason'),
    authoredBy: requiredText(input.authoredBy, 'authoredBy'),
    occurredAt
  });
  const inventoryValueCents = safeNumber(
    roundedRatio(BigInt(quantityOnHandMicros) * BigInt(averageUnitCostMicros), COST_SCALE),
    'inventoryValueCents'
  );
  return Object.freeze({
    movement,
    position: Object.freeze({
      tenantId: movement.tenantId,
      ingredientId: movement.ingredientId,
      quantityOnHandMicros,
      averageUnitCostMicros,
      inventoryValueCents,
      lastMovementAt: occurredAt
    })
  });
}
