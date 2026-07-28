import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import {
  InventoryAuthorizationError,
  InventoryIngredientNotFoundError
} from '../domain/inventory-errors.js';
import {
  createStockPosting,
  emptyStockPosition,
  type StockMovement,
  type StockMovementType,
  type StockPosition,
  type StockPosting
} from '../domain/inventory-model.js';
import type { InventoryIngredientCatalog, InventoryRepository } from './inventory-repository.js';

export interface InventoryIdGenerator {
  generate(): string;
}

export interface InventoryClock {
  now(): Date;
}

export interface RecordPurchaseInput {
  readonly ingredientId: string;
  readonly quantityMicros: number;
  readonly totalCostCents: number;
  readonly reference: string;
}

export interface RecordConsumptionInput {
  readonly ingredientId: string;
  readonly quantityMicros: number;
  readonly reason: string;
}

export interface RecordAdjustmentInput {
  readonly ingredientId: string;
  readonly direction: 'IN' | 'OUT';
  readonly quantityMicros: number;
  readonly totalCostCents?: number;
  readonly reason: string;
}

function inventoryAuthorization(
  context: AuthorizedAccessContext,
  expectedAction: string
): { tenantId: string; authoredBy: string } {
  const authorized = consumeAuthorizedAccess(context);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'inventory.management'
  ) {
    throw new InventoryAuthorizationError();
  }
  return {
    tenantId: authorized.request.tenant.tenantId.toString(),
    authoredBy: authorized.request.identity.principal.id.toString()
  };
}

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly catalog: InventoryIngredientCatalog,
    private readonly ids: InventoryIdGenerator,
    private readonly clock: InventoryClock
  ) {}

  async recordPurchase(
    access: AuthorizedAccessContext,
    input: RecordPurchaseInput
  ): Promise<StockPosting> {
    return this.recordInbound(
      access,
      'inventory.purchase.create',
      'PURCHASE_IN',
      input.ingredientId,
      input.quantityMicros,
      input.totalCostCents,
      input.reference
    );
  }

  async recordConsumption(
    access: AuthorizedAccessContext,
    input: RecordConsumptionInput
  ): Promise<StockPosting> {
    return this.record(
      access,
      'inventory.consumption.create',
      'CONSUMPTION_OUT',
      input.ingredientId,
      input.quantityMicros,
      input.reason
    );
  }

  async recordAdjustment(
    access: AuthorizedAccessContext,
    input: RecordAdjustmentInput
  ): Promise<StockPosting> {
    const type = `ADJUSTMENT_${input.direction}` as StockMovementType;
    if (input.direction === 'IN') {
      return this.recordInbound(
        access,
        'inventory.adjustment.create',
        type,
        input.ingredientId,
        input.quantityMicros,
        input.totalCostCents ?? 0,
        input.reason
      );
    }
    return this.record(
      access,
      'inventory.adjustment.create',
      type,
      input.ingredientId,
      input.quantityMicros,
      input.reason
    );
  }

  async getPosition(access: AuthorizedAccessContext, ingredientId: string): Promise<StockPosition> {
    const { tenantId } = inventoryAuthorization(access, 'inventory.position.read');
    await this.requireIngredient(tenantId, ingredientId);
    return (
      (await this.repository.findPosition(tenantId, ingredientId)) ??
      emptyStockPosition(tenantId, ingredientId)
    );
  }

  async listPositions(access: AuthorizedAccessContext): Promise<readonly StockPosition[]> {
    const { tenantId } = inventoryAuthorization(access, 'inventory.position.read');
    return this.repository.listPositions(tenantId);
  }

  async listMovements(
    access: AuthorizedAccessContext,
    ingredientId: string,
    limit = 50
  ): Promise<readonly StockMovement[]> {
    const { tenantId } = inventoryAuthorization(access, 'inventory.movement.read');
    await this.requireIngredient(tenantId, ingredientId);
    return this.repository.listMovements(tenantId, ingredientId, Math.min(Math.max(limit, 1), 100));
  }

  private async recordInbound(
    access: AuthorizedAccessContext,
    action: string,
    type: StockMovementType,
    ingredientId: string,
    quantityMicros: number,
    totalCostCents: number,
    reason: string
  ): Promise<StockPosting> {
    return this.record(access, action, type, ingredientId, quantityMicros, reason, totalCostCents);
  }

  private async record(
    access: AuthorizedAccessContext,
    action: string,
    type: StockMovementType,
    ingredientId: string,
    quantityMicros: number,
    reason: string,
    totalCostCents?: number
  ): Promise<StockPosting> {
    const { tenantId, authoredBy } = inventoryAuthorization(access, action);
    await this.requireIngredient(tenantId, ingredientId);
    const common = {
      id: this.ids.generate(),
      tenantId,
      ingredientId,
      type,
      quantityMicros,
      reason,
      authoredBy,
      occurredAt: this.clock.now()
    };
    return this.repository.transact(tenantId, ingredientId, (current) =>
      createStockPosting(
        current,
        totalCostCents === undefined ? common : { ...common, totalCostCents }
      )
    );
  }

  private async requireIngredient(tenantId: string, ingredientId: string): Promise<void> {
    if (!(await this.catalog.ingredientExists(tenantId, ingredientId))) {
      throw new InventoryIngredientNotFoundError();
    }
  }
}
