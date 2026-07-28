import { createTenantIdFromTrustedValue } from '../domain/tenant-id.js';
import { TenantResolutionError } from '../domain/tenancy-errors.js';
import { resolvedTenant, type TenantResolutionResult } from './tenant-resolver.js';

describe('Tenant resolution result', () => {
  it('represents resolution without authorization semantics', () => {
    const result = resolvedTenant(createTenantIdFromTrustedValue('opaque-a'));

    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.context.tenantId.toString()).toBe('opaque-a');
      expect(Object.isFrozen(result.context)).toBe(true);
    }
  });

  it('supports an explicit resolution failure', () => {
    const result: TenantResolutionResult = {
      resolved: false,
      error: new TenantResolutionError()
    };

    expect(result.resolved).toBe(false);
    if (!result.resolved) expect(result.error.code).toBe('TENANT_RESOLUTION_FAILED');
  });
});
