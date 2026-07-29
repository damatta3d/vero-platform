import {
  createStockPosting,
  type StockPosition,
  type StockPosting
} from '@vero/business-inventory';
import { InvalidSaleDataError } from './sales-errors.js';

const MICRO_SCALE = 1_000_000n;
const COST_SCALE = MICRO_SCALE * MICRO_SCALE;

export interface SaleRecipeLineSnapshot {
  readonly ingredientId: string;
  readonly recipeQuantityMicros: number;
  readonly catalogUnitCostMicros: number;
}

export interface SalePreparation {
  readonly tenantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly recipeId: string;
  readonly recipeVersion: number;
  readonly yieldUnits: number;
  readonly unitSalePriceCents: number;
  readonly recipeLines: readonly SaleRecipeLineSnapshot[];
  readonly stockPositions: readonly StockPosition[];
}

export interface SaleCostLine {
  readonly ingredientId: string;
  readonly movementId: string;
  readonly quantityMicros: number;
  readonly estimatedUnitCostMicros: number;
  readonly realizedUnitCostMicros: number;
  readonly estimatedCostCents: number;
  readonly realizedCostCents: number;
}

export interface Sale {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly productId: string;
  readonly productName: string;
  readonly recipeId: string;
  readonly recipeVersion: number;
  readonly quantity: number;
  readonly unitSalePriceCents: number;
  readonly grossRevenueCents: number;
  readonly estimatedCmvCents: number;
  readonly realizedCmvCents: number;
  readonly marginCents: number;
  readonly marginBasisPoints: number;
  readonly costLines: readonly SaleCostLine[];
  readonly authoredBy: string;
  readonly soldAt: Date;
}

export interface SalePosting {
  readonly sale: Sale;
  readonly stockPostings: readonly StockPosting[];
}

export interface CompleteSaleInput {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly quantity: number;
  readonly movementIds: Readonly<Record<string, string>>;
  readonly authoredBy: string;
  readonly soldAt: Date;
}

export interface SalesSummary {
  readonly salesCount: number;
  readonly unitsSold: number;
  readonly grossRevenueCents: number;
  readonly estimatedCmvCents: number;
  readonly realizedCmvCents: number;
  readonly marginCents: number;
  readonly marginBasisPoints: number;
}

function requiredText(value: string, field: string, maximum = 256): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new InvalidSaleDataError(field);
  }
  return normalized;
}

function positiveSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidSaleDataError(field);
  return value;
}

function nonNegativeSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new InvalidSaleDataError(field);
  return value;
}

function safeNumber(value: bigint, field: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new InvalidSaleDataError(field);
  return converted;
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function completeSale(preparation: SalePreparation, input: CompleteSaleInput): SalePosting {
  if (preparation.tenantId !== input.tenantId) throw new InvalidSaleDataError('tenantId');
  const quantity = positiveSafeInteger(input.quantity, 'quantity');
  const yieldUnits = positiveSafeInteger(preparation.yieldUnits, 'yieldUnits');
  if (preparation.recipeLines.length === 0) throw new InvalidSaleDataError('recipeLines');
  const soldAt = new Date(input.soldAt);
  if (Number.isNaN(soldAt.getTime())) throw new InvalidSaleDataError('soldAt');

  const positionByIngredient = new Map(
    preparation.stockPositions.map((position) => [position.ingredientId, position])
  );
  const stockPostings: StockPosting[] = [];
  const costLines: SaleCostLine[] = [];

  for (const line of preparation.recipeLines) {
    const position = positionByIngredient.get(line.ingredientId);
    const movementId = input.movementIds[line.ingredientId];
    if (!position || !movementId) throw new InvalidSaleDataError('stockPosition');
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
      reason: `Venda ${input.id}`,
      authoredBy: input.authoredBy,
      occurredAt: soldAt
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

  const grossRevenueCents =
    positiveSafeInteger(preparation.unitSalePriceCents, 'unitSalePriceCents') * quantity;
  if (!Number.isSafeInteger(grossRevenueCents)) {
    throw new InvalidSaleDataError('grossRevenueCents');
  }
  const estimatedCmvCents = costLines.reduce((total, line) => total + line.estimatedCostCents, 0);
  const realizedCmvCents = costLines.reduce((total, line) => total + line.realizedCostCents, 0);
  const marginCents = grossRevenueCents - realizedCmvCents;
  const marginBasisPoints = Math.round((marginCents * 10_000) / grossRevenueCents);

  return Object.freeze({
    sale: Object.freeze({
      id: requiredText(input.id, 'saleId', 160),
      tenantId: requiredText(input.tenantId, 'tenantId', 128),
      idempotencyKey: requiredText(input.idempotencyKey, 'idempotencyKey', 160),
      productId: requiredText(preparation.productId, 'productId', 160),
      productName: requiredText(preparation.productName, 'productName', 160),
      recipeId: requiredText(preparation.recipeId, 'recipeId', 160),
      recipeVersion: positiveSafeInteger(preparation.recipeVersion, 'recipeVersion'),
      quantity,
      unitSalePriceCents: preparation.unitSalePriceCents,
      grossRevenueCents,
      estimatedCmvCents,
      realizedCmvCents,
      marginCents,
      marginBasisPoints,
      costLines: Object.freeze(costLines),
      authoredBy: requiredText(input.authoredBy, 'authoredBy'),
      soldAt
    }),
    stockPostings: Object.freeze(stockPostings)
  });
}
