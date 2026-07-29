import { Prisma, type PrismaClient } from '@prisma/client';

import {
  emptyStockPosition,
  type StockPosition,
  type StockPosting
} from '@vero/business-inventory';
import {
  ProductionProductNotFoundError,
  type ProductionCostLine,
  type ProductionPostingDecision,
  type ProductionRecord,
  type ProductionRepository,
  type ProductionSummary
} from '@vero/business-production';

type ProductionPrismaClient = InstanceType<typeof PrismaClient>;
const COST_SCALE = 1_000_000_000_000n;

function safeNumber(value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error('Production value exceeds safe range.');
  return converted;
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function positionFromRow(row: {
  tenantId: string;
  ingredientId: string;
  quantityOnHandMicros: bigint;
  averageUnitCostMicros: bigint;
  inventoryValueCents: number;
  lastMovementAt: Date | null;
}): StockPosition {
  const base = {
    tenantId: row.tenantId,
    ingredientId: row.ingredientId,
    quantityOnHandMicros: safeNumber(row.quantityOnHandMicros),
    averageUnitCostMicros: safeNumber(row.averageUnitCostMicros),
    inventoryValueCents: row.inventoryValueCents
  };
  return Object.freeze(
    row.lastMovementAt === null ? base : { ...base, lastMovementAt: row.lastMovementAt }
  );
}

function costLineFromRow(row: {
  ingredientId: string;
  movementId: string;
  quantityMicros: bigint;
  estimatedUnitCostMicros: bigint;
  realizedUnitCostMicros: bigint;
  estimatedCostCents: number;
  realizedCostCents: number;
}): ProductionCostLine {
  return Object.freeze({
    ...row,
    quantityMicros: safeNumber(row.quantityMicros),
    estimatedUnitCostMicros: safeNumber(row.estimatedUnitCostMicros),
    realizedUnitCostMicros: safeNumber(row.realizedUnitCostMicros)
  });
}

function productionFromRow(row: {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  productId: string;
  productName: string;
  recipeId: string;
  recipeVersion: number;
  yieldUnits: number;
  quantity: number;
  estimatedCmvCents: number;
  realizedCmvCents: number;
  authoredBy: string;
  producedAt: Date;
  costLines: Array<{
    ingredientId: string;
    movementId: string;
    quantityMicros: bigint;
    estimatedUnitCostMicros: bigint;
    realizedUnitCostMicros: bigint;
    estimatedCostCents: number;
    realizedCostCents: number;
  }>;
}): ProductionRecord {
  return Object.freeze({
    ...row,
    costLines: Object.freeze(row.costLines.map(costLineFromRow))
  });
}

async function persistStockPosting(
  transaction: Prisma.TransactionClient,
  posting: StockPosting
): Promise<void> {
  await transaction.inventoryStockMovement.create({
    data: {
      ...posting.movement,
      quantityMicros: BigInt(posting.movement.quantityMicros),
      unitCostMicros: BigInt(posting.movement.unitCostMicros)
    }
  });
  await transaction.inventoryStockPosition.upsert({
    where: {
      tenantId_ingredientId: {
        tenantId: posting.position.tenantId,
        ingredientId: posting.position.ingredientId
      }
    },
    create: {
      tenantId: posting.position.tenantId,
      ingredientId: posting.position.ingredientId,
      quantityOnHandMicros: BigInt(posting.position.quantityOnHandMicros),
      averageUnitCostMicros: BigInt(posting.position.averageUnitCostMicros),
      inventoryValueCents: posting.position.inventoryValueCents,
      lastMovementAt: posting.position.lastMovementAt ?? null,
      updatedAt: posting.movement.occurredAt
    },
    update: {
      quantityOnHandMicros: BigInt(posting.position.quantityOnHandMicros),
      averageUnitCostMicros: BigInt(posting.position.averageUnitCostMicros),
      inventoryValueCents: posting.position.inventoryValueCents,
      lastMovementAt: posting.position.lastMovementAt ?? null,
      updatedAt: posting.movement.occurredAt
    }
  });
}

export class PrismaProductionRepository implements ProductionRepository {
  constructor(private readonly client: ProductionPrismaClient) {}

  async transact(
    tenantId: string,
    productId: string,
    idempotencyKey: string,
    decide: ProductionPostingDecision
  ): Promise<ProductionRecord> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.client.$transaction(
          async (transaction) => {
            const existing = await transaction.productionRecord.findUnique({
              where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
              include: { costLines: true }
            });
            if (existing) return productionFromRow(existing);

            const product = await transaction.catalogProduct.findUnique({
              where: { tenantId_id: { tenantId, id: productId } },
              include: {
                recipes: {
                  orderBy: { version: 'desc' },
                  take: 1,
                  include: {
                    lines: {
                      include: {
                        ingredient: { include: { stockPosition: true } }
                      }
                    }
                  }
                }
              }
            });
            const recipe = product?.recipes[0];
            if (!product || !recipe) throw new ProductionProductNotFoundError();

            const posting = decide({
              tenantId,
              productId: product.id,
              productName: product.name,
              recipeId: recipe.id,
              recipeVersion: recipe.version,
              yieldUnits: recipe.yieldUnits,
              recipeLines: recipe.lines.map((line) => ({
                ingredientId: line.ingredientId,
                recipeQuantityMicros: safeNumber(line.quantityMicros),
                catalogUnitCostMicros: safeNumber(
                  roundedRatio(
                    BigInt(line.ingredient.packageCostCents) * COST_SCALE,
                    line.ingredient.packageQuantityMicros
                  )
                )
              })),
              stockPositions: recipe.lines.map((line) =>
                line.ingredient.stockPosition
                  ? positionFromRow(line.ingredient.stockPosition)
                  : emptyStockPosition(tenantId, line.ingredientId)
              )
            });

            for (const stockPosting of posting.stockPostings) {
              await persistStockPosting(transaction, stockPosting);
            }
            const production = posting.production;
            await transaction.productionRecord.create({
              data: {
                id: production.id,
                tenantId: production.tenantId,
                idempotencyKey: production.idempotencyKey,
                productId: production.productId,
                productName: production.productName,
                recipeId: production.recipeId,
                recipeVersion: production.recipeVersion,
                yieldUnits: production.yieldUnits,
                quantity: production.quantity,
                estimatedCmvCents: production.estimatedCmvCents,
                realizedCmvCents: production.realizedCmvCents,
                authoredBy: production.authoredBy,
                producedAt: production.producedAt,
                costLines: {
                  create: production.costLines.map((line) => ({
                    ingredientId: line.ingredientId,
                    movementId: line.movementId,
                    quantityMicros: BigInt(line.quantityMicros),
                    estimatedUnitCostMicros: BigInt(line.estimatedUnitCostMicros),
                    realizedUnitCostMicros: BigInt(line.realizedUnitCostMicros),
                    estimatedCostCents: line.estimatedCostCents,
                    realizedCostCents: line.realizedCostCents
                  }))
                }
              }
            });
            return production;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (error) {
        if (
          attempt < 3 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Production transaction retry limit exceeded.');
  }

  async listProduction(tenantId: string, limit: number): Promise<readonly ProductionRecord[]> {
    const rows = await this.client.productionRecord.findMany({
      where: { tenantId },
      include: { costLines: true },
      orderBy: { producedAt: 'desc' },
      take: limit
    });
    return rows.map(productionFromRow);
  }

  async summarize(tenantId: string): Promise<ProductionSummary> {
    const aggregate = await this.client.productionRecord.aggregate({
      where: { tenantId },
      _count: { _all: true },
      _sum: {
        quantity: true,
        estimatedCmvCents: true,
        realizedCmvCents: true
      }
    });
    return Object.freeze({
      productionCount: aggregate._count._all,
      unitsProduced: aggregate._sum.quantity ?? 0,
      estimatedCmvCents: aggregate._sum.estimatedCmvCents ?? 0,
      realizedCmvCents: aggregate._sum.realizedCmvCents ?? 0
    });
  }
}
