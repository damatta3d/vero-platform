import { inspect } from 'node:util';
import {
  AuthenticationEvidence,
  readAuthenticationEvidence
} from './authentication-evidence.js';
import {
  AuthenticationEvidenceRequiredError,
  InvalidAuthenticationEvidenceError
} from './identity-errors.js';

describe('AuthenticationEvidence', () => {
  it('is opaque, immutable and redacted in every safe representation', () => {
    const secret = 'bearer-secret-value';
    const evidence = AuthenticationEvidence.fromUntrusted(secret);

    expect(Object.keys(evidence)).toEqual([]);
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(String(evidence)).toBe('[REDACTED]');
    expect(JSON.stringify(evidence)).toBe('"[REDACTED]"');
    expect(inspect(evidence)).toBe('[REDACTED]');
    expect(inspect(evidence)).not.toContain(secret);
    expect(readAuthenticationEvidence(evidence)).toBe(secret);
  });

  it('accepts non-empty binary evidence without exposing it', () => {
    const evidence = AuthenticationEvidence.fromUntrusted(new Uint8Array([1, 2, 3]));
    expect(String(evidence)).toBe('[REDACTED]');
    expect(readAuthenticationEvidence(evidence)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects forged evidence at the internal reader boundary', () => {
    expect(() => readAuthenticationEvidence({} as AuthenticationEvidence)).toThrow(
      InvalidAuthenticationEvidenceError
    );
  });

  it.each([undefined, null])('requires evidence for %p', (value) => {
    expect(() => AuthenticationEvidence.fromUntrusted(value)).toThrow(
      AuthenticationEvidenceRequiredError
    );
  });

  it.each(['', '   ', 0, {}, new Uint8Array()])('rejects invalid evidence %p', (value) => {
    expect(() => AuthenticationEvidence.fromUntrusted(value)).toThrow(
      InvalidAuthenticationEvidenceError
    );
  });
});
