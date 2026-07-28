const tenantIdBrand: unique symbol = Symbol('TenantId');

export interface TenantId {
  readonly [tenantIdBrand]: true;
  equals(other: TenantId): boolean;
  toString(): string;
}

class ResolvedTenantId implements TenantId {
  readonly [tenantIdBrand] = true;

  constructor(private readonly value: string) {
    Object.freeze(this);
  }

  equals(other: TenantId): boolean {
    return this.value === other.toString();
  }

  toString(): string {
    return this.value;
  }
}

export function createTenantIdFromTrustedValue(value: string): TenantId {
  return new ResolvedTenantId(value);
}
