import type { AuthenticationEvidence } from '../domain/authentication-evidence.js';
import { AuthenticationFailedError } from '../domain/identity-errors.js';
import type { IdentityContext } from './identity-context.js';
import { isTrustedIdentityContext } from './identity-context.js';

export type AuthenticationResult =
  | { readonly authenticated: true; readonly context: IdentityContext }
  | { readonly authenticated: false; readonly error: AuthenticationFailedError };

export interface Authenticator {
  authenticate(evidence: AuthenticationEvidence): Promise<AuthenticationResult>;
}

const trustedResults = new WeakSet<object>();

export function createTrustedAuthenticationResult(
  context: IdentityContext
): AuthenticationResult {
  if (!isTrustedIdentityContext(context)) throw new AuthenticationFailedError();
  const result = Object.freeze({ authenticated: true as const, context });
  trustedResults.add(result);
  return result;
}

export function authenticationFailed(): AuthenticationResult {
  const result = Object.freeze({
    authenticated: false as const,
    error: new AuthenticationFailedError()
  });
  trustedResults.add(result);
  return result;
}

export function requireTrustedAuthenticationResult(
  value: unknown
): AuthenticationResult {
  if (typeof value !== 'object' || value === null || !trustedResults.has(value)) {
    throw new AuthenticationFailedError();
  }
  return value as AuthenticationResult;
}
