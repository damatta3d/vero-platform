import type { TenantId } from '../domain/tenant-id.js';
import { TenantContextRequiredError } from '../domain/tenancy-errors.js';

export interface ResolvedTenantContext {
  readonly tenantId: TenantId;
}

export function createResolvedTenantContext(tenantId: TenantId): ResolvedTenantContext {
  return Object.freeze({ tenantId });
}

export function requireResolvedTenantContext(
  context: ResolvedTenantContext | undefined
): ResolvedTenantContext {
  if (context === undefined) throw new TenantContextRequiredError();
  return context;
}
