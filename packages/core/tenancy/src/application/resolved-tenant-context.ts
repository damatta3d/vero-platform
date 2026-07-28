import type { TenantId } from '../domain/tenant-id.js';
import { isTrustedTenantId } from '../domain/tenant-id.js';
import { TenantContextRequiredError, TenantResolutionError } from '../domain/tenancy-errors.js';

const trustedContexts = new WeakSet<object>();

export interface ResolvedTenantContext {
  readonly tenantId: TenantId;
}

export function createResolvedTenantContext(tenantId: TenantId): ResolvedTenantContext {
  if (!isTrustedTenantId(tenantId)) throw new TenantResolutionError();
  const context = Object.freeze({ tenantId });
  trustedContexts.add(context);
  return context;
}

export function requireResolvedTenantContext(context: unknown): ResolvedTenantContext {
  if (context === undefined || context === null) throw new TenantContextRequiredError();
  if (typeof context !== 'object' || !trustedContexts.has(context)) {
    throw new TenantResolutionError();
  }
  return context as ResolvedTenantContext;
}
