const tenantIdBrand: unique symbol = Symbol('TenantId');
const trustedTenantIds = new WeakSet<object>();

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
  if (value.trim().length === 0) throw new Error('Trusted tenant value is required.');
  const tenantId = new ResolvedTenantId(value);
  trustedTenantIds.add(tenantId);
  return tenantId;
}

export function isTrustedTenantId(value: unknown): value is TenantId {
  return typeof value === 'object' && value !== null && trustedTenantIds.has(value);
}
