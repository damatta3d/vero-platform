import type { TenantCandidate } from '../domain/tenant-candidate.js';
import type { TenantId } from '../domain/tenant-id.js';
import type { TenantResolutionError } from '../domain/tenancy-errors.js';
import type { ResolvedTenantContext } from './resolved-tenant-context.js';
import { createResolvedTenantContext } from './resolved-tenant-context.js';

export type TenantResolutionResult =
  | { readonly resolved: true; readonly context: ResolvedTenantContext }
  | { readonly resolved: false; readonly error: TenantResolutionError };

export interface TenantResolver {
  resolve(candidate: TenantCandidate): Promise<TenantResolutionResult>;
}

export function resolvedTenant(tenantId: TenantId): TenantResolutionResult {
  return { resolved: true, context: createResolvedTenantContext(tenantId) };
}
