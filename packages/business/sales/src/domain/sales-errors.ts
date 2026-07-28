export class SalesError extends Error {}

export class InvalidSaleDataError extends SalesError {
  constructor(readonly field: string) {
    super(`Invalid sale data: ${field}.`);
  }
}

export class SalesAuthorizationError extends SalesError {
  constructor() {
    super('Sale operation is not authorized.');
  }
}

export class SaleProductNotFoundError extends SalesError {
  constructor() {
    super('Product or active recipe was not found.');
  }
}
