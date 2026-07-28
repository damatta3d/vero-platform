export class InventoryError extends Error {}

export class InvalidInventoryDataError extends InventoryError {
  constructor(field: string) {
    super(`Invalid inventory data: ${field}.`);
  }
}

export class InventoryAuthorizationError extends InventoryError {
  constructor() {
    super('The access context does not authorize this inventory operation.');
  }
}

export class InventoryIngredientNotFoundError extends InventoryError {
  constructor() {
    super('Ingredient was not found inside the authorized tenant.');
  }
}

export class InsufficientStockError extends InventoryError {
  constructor() {
    super('The movement would produce negative stock.');
  }
}
