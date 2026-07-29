import { Prisma, type PrismaClient } from '@prisma/client';

import {
  emptyStockPosition,
  type InventoryIngredientCatalog,
  type InventoryRepository,
  type StockMovement,
  type StockMovementType,
  type StockPosition,
  type StockPosting,
  type StockPostingDecision
} from '@vero/business-inventory';

type InventoryPrismaClient = InstanceType<typeof PrismaClient>;

function safeNumber(value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error('Inventory value exceeds safe range.');
  return converted;
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

function movementFromRow(row: {
  id: string;
  tenantId: string;
  ingredientId: string;
  type: string;
  quantityMicros: bigint;
  unitCostMicros: bigint;
  totalCostCents: number;
  reason: string;
  authoredBy: string;
  occurredAt: Date;
}): StockMovement {
  return Object.freeze({
    ...row,
    type: row.type as StockMovementType,
    quantityMicros: safeNumber(row.quantityMicros),
    unitCostMicros: safeNumber(row.unitCostMicros)
  });
}

export class PrismaInventoryRepository implements InventoryRepository, InventoryIngredientCatalog {
  constructor(private readonly client: InventoryPrismaClient) {}

  async ingredientExists(tenantId: string, ingredientId: string): Promise<boolean> {
    return (
      (await this.client.catalogIngredient.count({
        where: { tenantId, id: ingredientId }
      })) === 1
    );
  }

  async transact(
    tenantId: string,
    ingredientId: string,
    decide: StockPostingDecision
  ): Promise<StockPosting> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.client.$transaction(
          async (transaction) => {
            const row = await transaction.inventoryStockPosition.findUnique({
              where: { tenantId_ingredientId: { tenantId, ingredientId } }
            });
            const posting = decide(
              row ? positionFromRow(row) : emptyStockPosition(tenantId, ingredientId)
            );
            await transaction.inventoryStockMovement.create({
              data: {
                ...posting.movement,
                quantityMicros: BigInt(posting.movement.quantityMicros),
                unitCostMicros: BigInt(posting.movement.unitCostMicros)
              }
            });
            await transaction.inventoryStockPosition.upsert({
              where: { tenantId_ingredientId: { tenantId, ingredientId } },
              create: {
                tenantId,
                ingredientId,
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
            return posting;
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
    throw new Error('Inventory transaction retry limit exceeded.');
  }

  async findPosition(tenantId: string, ingredientId: string): Promise<StockPosition | undefined> {
    const row = await this.client.inventoryStockPosition.findUnique({
      where: { tenantId_ingredientId: { tenantId, ingredientId } }
    });
    return row ? positionFromRow(row) : undefined;
  }

  async listPositions(tenantId: string): Promise<readonly StockPosition[]> {
    const rows = await this.client.inventoryStockPosition.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });
    return rows.map(positionFromRow);
  }

  async listMovements(
    tenantId: string,
    ingredientId: string,
    limit: number
  ): Promise<readonly StockMovement[]> {
    const rows = await this.client.inventoryStockMovement.findMany({
      where: { tenantId, ingredientId },
      orderBy: { occurredAt: 'desc' },
      take: limit
    });
    return rows.map(movementFromRow);
  }
}
