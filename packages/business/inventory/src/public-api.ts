export {
  InsufficientStockError,
  InvalidInventoryDataError,
  InventoryAuthorizationError,
  InventoryError,
  InventoryIngredientNotFoundError
} from './domain/inventory-errors.js';
export {
  createStockPosting,
  emptyStockPosition,
  stockMovementTypeValues,
  type CreateStockPostingInput,
  type StockMovement,
  type StockMovementType,
  type StockPosition,
  type StockPosting
} from './domain/inventory-model.js';
export type {
  InventoryIngredientCatalog,
  InventoryRepository,
  StockPostingDecision
} from './application/inventory-repository.js';
export {
  InventoryService,
  type InventoryClock,
  type InventoryIdGenerator,
  type RecordAdjustmentInput,
  type RecordConsumptionInput,
  type RecordPurchaseInput
} from './application/inventory-service.js';
