import { Prisma, type PrismaClient } from '@prisma/client';

import {
  emptyStockPosition,
  type StockPosition,
  type StockPosting
} from '@vero/business-inventory';
import {
  SaleProductNotFoundError,
  type Sale,
  type SaleCostLine,
  type SalePostingDecision,
  type SalesRepository,
  type SalesSummary
} from '@vero/business-sales';

type SalesPrismaClient = InstanceType<typeof PrismaClient>;
const COST_SCALE = 1_000_000_000_000n;

function safeNumber(value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error('Sales value exceeds safe range.');
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
}): SaleCostLine {
  return Object.freeze({
    ...row,
    quantityMicros: safeNumber(row.quantityMicros),
    estimatedUnitCostMicros: safeNumber(row.estimatedUnitCostMicros),
    realizedUnitCostMicros: safeNumber(row.realizedUnitCostMicros)
  });
}

function saleFromRow(row: {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  productId: string;
  productName: string;
  recipeId: string;
  recipeVersion: number;
  quantity: number;
  unitSalePriceCents: number;
  grossRevenueCents: number;
  estimatedCmvCents: number;
  realizedCmvCents: number;
  marginCents: number;
  marginBasisPoints: number;
  authoredBy: string;
  soldAt: Date;
  costLines: Array<{
    ingredientId: string;
    movementId: string;
    quantityMicros: bigint;
    estimatedUnitCostMicros: bigint;
    realizedUnitCostMicros: bigint;
    estimatedCostCents: number;
    realizedCostCents: number;
  }>;
}): Sale {
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

export class PrismaSalesRepository implements SalesRepository {
  constructor(private readonly client: SalesPrismaClient) {}

  async transact(
    tenantId: string,
    productId: string,
    idempotencyKey: string,
    decide: SalePostingDecision
  ): Promise<Sale> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.client.$transaction(
          async (transaction) => {
            const existing = await transaction.salesRecord.findUnique({
              where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
              include: { costLines: true }
            });
            if (existing) return saleFromRow(existing);

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
            if (!product || !recipe) throw new SaleProductNotFoundError();

            const posting = decide({
              tenantId,
              productId: product.id,
              productName: product.name,
              recipeId: recipe.id,
              recipeVersion: recipe.version,
              yieldUnits: recipe.yieldUnits,
              unitSalePriceCents: product.salePriceCents,
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
            const sale = posting.sale;
            await transaction.salesRecord.create({
              data: {
                id: sale.id,
                tenantId: sale.tenantId,
                idempotencyKey: sale.idempotencyKey,
                productId: sale.productId,
                productName: sale.productName,
                recipeId: sale.recipeId,
                recipeVersion: sale.recipeVersion,
                quantity: sale.quantity,
                unitSalePriceCents: sale.unitSalePriceCents,
                grossRevenueCents: sale.grossRevenueCents,
                estimatedCmvCents: sale.estimatedCmvCents,
                realizedCmvCents: sale.realizedCmvCents,
                marginCents: sale.marginCents,
                marginBasisPoints: sale.marginBasisPoints,
                authoredBy: sale.authoredBy,
                soldAt: sale.soldAt,
                costLines: {
                  create: sale.costLines.map((line) => ({
                    tenantId: sale.tenantId,
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
            return sale;
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
    throw new Error('Sales transaction retry limit exceeded.');
  }

  async listSales(tenantId: string, limit: number): Promise<readonly Sale[]> {
    const rows = await this.client.salesRecord.findMany({
      where: { tenantId },
      include: { costLines: true },
      orderBy: { soldAt: 'desc' },
      take: limit
    });
    return rows.map(saleFromRow);
  }

  async summarize(tenantId: string): Promise<SalesSummary> {
    const aggregate = await this.client.salesRecord.aggregate({
      where: { tenantId },
      _count: { _all: true },
      _sum: {
        quantity: true,
        grossRevenueCents: true,
        estimatedCmvCents: true,
        realizedCmvCents: true,
        marginCents: true
      }
    });
    const grossRevenueCents = aggregate._sum.grossRevenueCents ?? 0;
    const marginCents = aggregate._sum.marginCents ?? 0;
    return Object.freeze({
      salesCount: aggregate._count._all,
      unitsSold: aggregate._sum.quantity ?? 0,
      grossRevenueCents,
      estimatedCmvCents: aggregate._sum.estimatedCmvCents ?? 0,
      realizedCmvCents: aggregate._sum.realizedCmvCents ?? 0,
      marginCents,
      marginBasisPoints:
        grossRevenueCents === 0 ? 0 : Math.round((marginCents * 10_000) / grossRevenueCents)
    });
  }
}
