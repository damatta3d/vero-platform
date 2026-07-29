import * as publicApi from './public-api.js';

describe('core-tenancy public API', () => {
  it('exports only the deliberate runtime surface', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'InvalidTenantCandidateError',
      'TenancyError',
      'TenantCandidate',
      'TenantContextRequiredError',
      'TenantResolutionError',
      'createResolvedTenantContext',
      'createTenantResolver',
      'requireResolvedTenantContext'
    ]);
    expect(publicApi).not.toHaveProperty('AuthorizedTenantContext');
    expect(publicApi).not.toHaveProperty('createTenantIdFromTrustedValue');
    expect(publicApi).not.toHaveProperty('resolvedTenant');
  });
});
