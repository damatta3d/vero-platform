import { createTenantIdFromTrustedValue, type TenantId } from '../domain/tenant-id.js';
import { TenantContextRequiredError, TenantResolutionError } from '../domain/tenancy-errors.js';
import {
  createResolvedTenantContext,
  requireResolvedTenantContext
} from './resolved-tenant-context.js';

describe('ResolvedTenantContext', () => {
  it('is explicit and immutable', () => {
    const tenantId = createTenantIdFromTrustedValue('opaque-a');
    const context = createResolvedTenantContext(tenantId);

    expect(context.tenantId).toBe(tenantId);
    expect(Object.isFrozen(context)).toBe(true);
    expect(requireResolvedTenantContext(context)).toBe(context);
  });

  it('fails explicitly when context is absent', () => {
    expect(() => requireResolvedTenantContext(undefined)).toThrow(TenantContextRequiredError);
  });

  it('rejects forged tenant identifiers and contexts', () => {
    const forgedTenantId = {
      equals: () => true,
      toString: () => 'forged'
    } as unknown as TenantId;

    expect(() => createResolvedTenantContext(forgedTenantId)).toThrow(TenantResolutionError);
    expect(() =>
      requireResolvedTenantContext({ tenantId: createTenantIdFromTrustedValue('opaque-a') })
    ).toThrow(TenantResolutionError);
  });
});
