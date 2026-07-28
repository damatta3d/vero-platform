export class ProductionError extends Error {}

export class InvalidProductionDataError extends ProductionError {
  constructor(field: string) {
    super(`Invalid production data: ${field}.`);
  }
}

export class ProductionAuthorizationError extends ProductionError {
  constructor() {
    super('The access context does not authorize this production operation.');
  }
}

export class ProductionProductNotFoundError extends ProductionError {
  constructor() {
    super('Product or recipe was not found for production.');
  }
}
