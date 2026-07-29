import type { AuthenticationEvidence } from '../domain/authentication-evidence.js';
import { readAuthenticationEvidence } from '../domain/authentication-evidence.js';
import { AuthenticationFailedError } from '../domain/identity-errors.js';
import { createTrustedPrincipal, type PrincipalType } from '../domain/principal.js';
import type { IdentityContext } from './identity-context.js';
import { createTrustedIdentityContext, isTrustedIdentityContext } from './identity-context.js';

export type AuthenticationResult =
  | { readonly authenticated: true; readonly context: IdentityContext }
  | { readonly authenticated: false; readonly error: AuthenticationFailedError };

export interface Authenticator {
  authenticate(evidence: AuthenticationEvidence): Promise<AuthenticationResult>;
}

export interface VerifiedSubject {
  readonly authority: string;
  readonly subject: string;
  readonly type: PrincipalType;
}

export interface IdentityVerifier {
  verify(evidence: string | Uint8Array): Promise<VerifiedSubject | undefined>;
}

const trustedResults = new WeakSet<object>();

export function createTrustedAuthenticationResult(context: IdentityContext): AuthenticationResult {
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

export function requireTrustedAuthenticationResult(value: unknown): AuthenticationResult {
  if (typeof value !== 'object' || value === null || !trustedResults.has(value)) {
    throw new AuthenticationFailedError();
  }
  return value as AuthenticationResult;
}

export function createAuthenticator(verifier: IdentityVerifier): Authenticator {
  return Object.freeze({
    async authenticate(evidence: AuthenticationEvidence): Promise<AuthenticationResult> {
      try {
        const verified = await verifier.verify(readAuthenticationEvidence(evidence));
        if (!verified) return authenticationFailed();
        const principal = createTrustedPrincipal(
          verified.authority,
          verified.subject,
          verified.type
        );
        return createTrustedAuthenticationResult(createTrustedIdentityContext(principal));
      } catch {
        return authenticationFailed();
      }
    }
  });
}
