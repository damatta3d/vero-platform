export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCatalogDataError extends CatalogError {
  constructor(field: string) {
    super(`Invalid catalog data: ${field}.`);
  }
}

export class CatalogItemNotFoundError extends CatalogError {
  constructor(item: string) {
    super(`${item} was not found.`);
  }
}

export class CatalogTenantMismatchError extends CatalogError {
  constructor() {
    super('Catalog data belongs to another tenant.');
  }
}

export class CatalogAuthorizationError extends CatalogError {
  constructor() {
    super('Catalog operation is not authorized.');
  }
}
