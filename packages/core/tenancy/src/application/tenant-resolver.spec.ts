import { createTenantIdFromTrustedValue } from '../domain/tenant-id.js';
import { TenantCandidate } from '../domain/tenant-candidate.js';
import { TenantResolutionError } from '../domain/tenancy-errors.js';
import {
  createTenantResolver,
  resolvedTenant,
  type TenantResolutionResult
} from './tenant-resolver.js';

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

  it('resolves only candidates accepted by the tenant lookup', async () => {
    const resolver = createTenantResolver({
      findTenantId: (candidate) =>
        Promise.resolve(candidate === 'santo-parma' ? 'tenant-santo-parma' : undefined)
    });

    const accepted = await resolver.resolve(TenantCandidate.fromUntrusted('santo-parma'));
    expect(accepted.resolved).toBe(true);
    if (accepted.resolved) {
      expect(accepted.context.tenantId.toString()).toBe('tenant-santo-parma');
    }

    const denied = await resolver.resolve(TenantCandidate.fromUntrusted('other'));
    expect(denied.resolved).toBe(false);
  });

  it('converts lookup failures to safe resolution failures', async () => {
    const resolver = createTenantResolver({
      findTenantId: () => Promise.reject(new Error('provider detail'))
    });
    const result = await resolver.resolve(TenantCandidate.fromUntrusted('santo-parma'));
    expect(result.resolved).toBe(false);
  });
});
