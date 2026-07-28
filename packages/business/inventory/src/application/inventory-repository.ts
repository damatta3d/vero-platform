import type { StockPosting, StockPosition, StockMovement } from '../domain/inventory-model.js';

export type StockPostingDecision = (current: StockPosition) => StockPosting;

export interface InventoryRepository {
  transact(
    tenantId: string,
    ingredientId: string,
    decide: StockPostingDecision
  ): Promise<StockPosting>;
  findPosition(tenantId: string, ingredientId: string): Promise<StockPosition | undefined>;
  listPositions(tenantId: string): Promise<readonly StockPosition[]>;
  listMovements(
    tenantId: string,
    ingredientId: string,
    limit: number
  ): Promise<readonly StockMovement[]>;
}

export interface InventoryIngredientCatalog {
  ingredientExists(tenantId: string, ingredientId: string): Promise<boolean>;
}
