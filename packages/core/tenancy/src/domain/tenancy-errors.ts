export abstract class TenancyError extends Error {
  protected constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidTenantCandidateError extends TenancyError {
  constructor() {
    super('Tenant candidate is invalid.', 'TENANT_CANDIDATE_INVALID');
  }
}

export class TenantResolutionError extends TenancyError {
  constructor() {
    super('Tenant could not be resolved.', 'TENANT_RESOLUTION_FAILED');
  }
}

export class TenantContextRequiredError extends TenancyError {
  constructor() {
    super('Resolved tenant context is required.', 'TENANT_CONTEXT_REQUIRED');
  }
}
