import {
  InvalidTenantCandidateError,
  TenantContextRequiredError,
  TenantResolutionError
} from './tenancy-errors.js';

describe('Tenancy errors', () => {
  it.each([
    [new InvalidTenantCandidateError(), 'TENANT_CANDIDATE_INVALID'],
    [new TenantResolutionError(), 'TENANT_RESOLUTION_FAILED'],
    [new TenantContextRequiredError(), 'TENANT_CONTEXT_REQUIRED']
  ])('provides a transport-agnostic semantic code', (error, code) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(error.constructor.name);
    expect(error.code).toBe(code);
  });
});
