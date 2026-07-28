import { createTenantIdFromTrustedValue } from './tenant-id.js';

describe('TenantId', () => {
  it('keeps a trusted opaque value stable and comparable', () => {
    const tenantId = createTenantIdFromTrustedValue('opaque-a');
    const sameTenant = createTenantIdFromTrustedValue('opaque-a');
    const otherTenant = createTenantIdFromTrustedValue('opaque-b');

    expect(tenantId.toString()).toBe('opaque-a');
    expect(tenantId.equals(sameTenant)).toBe(true);
    expect(tenantId.equals(otherTenant)).toBe(false);
    expect(Object.isFrozen(tenantId)).toBe(true);
  });
});
