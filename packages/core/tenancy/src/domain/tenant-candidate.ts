import { InvalidTenantCandidateError } from './tenancy-errors.js';

const tenantCandidateValue = new WeakMap<TenantCandidate, string>();

export class TenantCandidate {
  private constructor(value: string) {
    tenantCandidateValue.set(this, value);
    Object.freeze(this);
  }

  static fromUntrusted(value: unknown): TenantCandidate {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new InvalidTenantCandidateError();
    }

    return new TenantCandidate(value);
  }
}

export function readTenantCandidate(candidate: TenantCandidate): string {
  const value = tenantCandidateValue.get(candidate);
  if (value === undefined) throw new InvalidTenantCandidateError();
  return value;
}
