import type { TenantCandidate } from '../domain/tenant-candidate.js';
import type { TenantId } from '../domain/tenant-id.js';
import type { TenantResolutionError } from '../domain/tenancy-errors.js';
import { TenantResolutionError as TenantResolutionFailure } from '../domain/tenancy-errors.js';
import { readTenantCandidate } from '../domain/tenant-candidate.js';
import { createTenantIdFromTrustedValue } from '../domain/tenant-id.js';
import type { ResolvedTenantContext } from './resolved-tenant-context.js';
import { createResolvedTenantContext } from './resolved-tenant-context.js';

export type TenantResolutionResult =
  | { readonly resolved: true; readonly context: ResolvedTenantContext }
  | { readonly resolved: false; readonly error: TenantResolutionError };

export interface TenantResolver {
  resolve(candidate: TenantCandidate): Promise<TenantResolutionResult>;
}

export interface TenantLookup {
  findTenantId(candidate: string): Promise<string | undefined>;
}

export function createTenantResolver(lookup: TenantLookup): TenantResolver {
  return Object.freeze({
    async resolve(candidate: TenantCandidate): Promise<TenantResolutionResult> {
      try {
        const tenantId = await lookup.findTenantId(readTenantCandidate(candidate));
        if (!tenantId) {
          return { resolved: false, error: new TenantResolutionFailure() };
        }
        return resolvedTenant(createTenantIdFromTrustedValue(tenantId));
      } catch {
        return { resolved: false, error: new TenantResolutionFailure() };
      }
    }
  });
}

export function resolvedTenant(tenantId: TenantId): TenantResolutionResult {
  return { resolved: true, context: createResolvedTenantContext(tenantId) };
}
