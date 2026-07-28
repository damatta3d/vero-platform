import { InvalidTenantCandidateError } from './tenancy-errors.js';
import { readTenantCandidate, TenantCandidate } from './tenant-candidate.js';

describe('TenantCandidate', () => {
  it('keeps untrusted input opaque and immutable', () => {
    const candidate = TenantCandidate.fromUntrusted(' external-reference ');

    expect(readTenantCandidate(candidate)).toBe(' external-reference ');
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.keys(candidate)).toHaveLength(0);
  });

  it.each([undefined, null, 42, '', '   '])('rejects invalid candidate %p', (value) => {
    expect(() => TenantCandidate.fromUntrusted(value)).toThrow(InvalidTenantCandidateError);
  });

  it('rejects forged candidate objects', () => {
    expect(() => readTenantCandidate({} as TenantCandidate)).toThrow(InvalidTenantCandidateError);
  });
});
