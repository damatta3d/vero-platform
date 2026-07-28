import { inspect } from 'node:util';
import {
  AuthenticationEvidenceRequiredError,
  InvalidAuthenticationEvidenceError
} from './identity-errors.js';

const REDACTED = '[REDACTED]';
const evidenceValues = new WeakMap<
  AuthenticationEvidence,
  string | Uint8Array
>();

export class AuthenticationEvidence {
  private constructor(value: string | Uint8Array) {
    evidenceValues.set(this, typeof value === 'string' ? value : value.slice());
    Object.freeze(this);
  }

  static fromUntrusted(value: unknown): AuthenticationEvidence {
    if (value === undefined || value === null) {
      throw new AuthenticationEvidenceRequiredError();
    }
    if (
      (typeof value !== 'string' || value.trim().length === 0) &&
      !(value instanceof Uint8Array && value.byteLength > 0)
    ) {
      throw new InvalidAuthenticationEvidenceError();
    }
    return new AuthenticationEvidence(value as string | Uint8Array);
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  [inspect.custom](): string {
    return REDACTED;
  }
}

export function readAuthenticationEvidence(
  evidence: AuthenticationEvidence
): string | Uint8Array {
  const value = evidenceValues.get(evidence);
  if (value === undefined) throw new InvalidAuthenticationEvidenceError();
  return typeof value === 'string' ? value : value.slice();
}
