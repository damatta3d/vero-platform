import {
  createStockPosting,
  type StockPosition,
  type StockPosting
} from '@vero/business-inventory';
import { InvalidProductionDataError } from './production-errors.js';

const MICRO_SCALE = 1_000_000n;
const COST_SCALE = MICRO_SCALE * MICRO_SCALE;

export interface ProductionRecipeLineSnapshot {
  readonly ingredientId: string;
  readonly recipeQuantityMicros: number;
  readonly catalogUnitCostMicros: number;
}

export interface ProductionPreparation {
  readonly tenantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly recipeId: string;
  readonly recipeVersion: number;
  readonly yieldUnits: number;
  readonly recipeLines: readonly ProductionRecipeLineSnapshot[];
  readonly stockPositions: readonly StockPosition[];
}

export interface ProductionCostLine {
  readonly ingredientId: string;
  readonly movementId: string;
  readonly quantityMicros: number;
  readonly estimatedUnitCostMicros: number;
  readonly realizedUnitCostMicros: number;
  readonly estimatedCostCents: number;
  readonly realizedCostCents: number;
}

export interface ProductionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly productId: string;
  readonly productName: string;
  readonly recipeId: string;
  readonly recipeVersion: number;
  readonly yieldUnits: number;
  readonly quantity: number;
  readonly estimatedCmvCents: number;
  readonly realizedCmvCents: number;
  readonly costLines: readonly ProductionCostLine[];
  readonly authoredBy: string;
  readonly producedAt: Date;
}

export interface ProductionPosting {
  readonly production: ProductionRecord;
  readonly stockPostings: readonly StockPosting[];
}

export interface CompleteProductionInput {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly quantity: number;
  readonly movementIds: Readonly<Record<string, string>>;
  readonly authoredBy: string;
  readonly producedAt: Date;
}

export interface ProductionSummary {
  readonly productionCount: number;
  readonly unitsProduced: number;
  readonly estimatedCmvCents: number;
  readonly realizedCmvCents: number;
}

function requiredText(value: string, field: string, maximum = 256): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new InvalidProductionDataError(field);
  }
  return normalized;
}

function positiveSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidProductionDataError(field);
  return value;
}

function nonNegativeSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new InvalidProductionDataError(field);
  return value;
}

function safeNumber(value: bigint, field: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new InvalidProductionDataError(field);
  return converted;
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function completeProduction(
  preparation: ProductionPreparation,
  input: CompleteProductionInput
): ProductionPosting {
  if (preparation.tenantId !== input.tenantId) {
    throw new InvalidProductionDataError('tenantId');
  }
  const quantity = positiveSafeInteger(input.quantity, 'quantity');
  const yieldUnits = positiveSafeInteger(preparation.yieldUnits, 'yieldUnits');
  if (preparation.recipeLines.length === 0) {
    throw new InvalidProductionDataError('recipeLines');
  }
  const producedAt = new Date(input.producedAt);
  if (Number.isNaN(producedAt.getTime())) throw new InvalidProductionDataError('producedAt');

  const positionByIngredient = new Map(
    preparation.stockPositions.map((position) => [position.ingredientId, position])
  );
  const stockPostings: StockPosting[] = [];
  const costLines: ProductionCostLine[] = [];

  for (const line of preparation.recipeLines) {
    const position = positionByIngredient.get(line.ingredientId);
    const movementId = input.movementIds[line.ingredientId];
    if (!position || !movementId) throw new InvalidProductionDataError('stockPosition');
    const requiredQuantity = safeNumber(
      roundedRatio(BigInt(line.recipeQuantityMicros) * BigInt(quantity), BigInt(yieldUnits)),
      'quantityMicros'
    );
    positiveSafeInteger(requiredQuantity, 'quantityMicros');
    const posting = createStockPosting(position, {
      id: movementId,
      tenantId: input.tenantId,
      ingredientId: line.ingredientId,
      type: 'CONSUMPTION_OUT',
      quantityMicros: requiredQuantity,
      reason: `Produção ${input.id}`,
      authoredBy: input.authoredBy,
      occurredAt: producedAt
    });
    const estimatedCostCents = safeNumber(
      roundedRatio(BigInt(requiredQuantity) * BigInt(line.catalogUnitCostMicros), COST_SCALE),
      'estimatedCostCents'
    );
    stockPostings.push(posting);
    costLines.push(
      Object.freeze({
        ingredientId: line.ingredientId,
        movementId,
        quantityMicros: requiredQuantity,
        estimatedUnitCostMicros: nonNegativeSafeInteger(
          line.catalogUnitCostMicros,
          'catalogUnitCostMicros'
        ),
        realizedUnitCostMicros: posting.movement.unitCostMicros,
        estimatedCostCents,
        realizedCostCents: posting.movement.totalCostCents
      })
    );
  }

  const estimatedCmvCents = costLines.reduce((total, line) => total + line.estimatedCostCents, 0);
  const realizedCmvCents = costLines.reduce((total, line) => total + line.realizedCostCents, 0);
  if (!Number.isSafeInteger(estimatedCmvCents) || !Number.isSafeInteger(realizedCmvCents)) {
    throw new InvalidProductionDataError('cmvCents');
  }

  return Object.freeze({
    production: Object.freeze({
      id: requiredText(input.id, 'productionId', 160),
      tenantId: requiredText(input.tenantId, 'tenantId', 128),
      idempotencyKey: requiredText(input.idempotencyKey, 'idempotencyKey', 160),
      productId: requiredText(preparation.productId, 'productId', 160),
      productName: requiredText(preparation.productName, 'productName', 160),
      recipeId: requiredText(preparation.recipeId, 'recipeId', 160),
      recipeVersion: positiveSafeInteger(preparation.recipeVersion, 'recipeVersion'),
      yieldUnits,
      quantity,
      estimatedCmvCents,
      realizedCmvCents,
      costLines: Object.freeze(costLines),
      authoredBy: requiredText(input.authoredBy, 'authoredBy'),
      producedAt
    }),
    stockPostings: Object.freeze(stockPostings)
  });
}
