import { AuthenticationEvidence } from '../domain/authentication-evidence.js';
import {
  AuthenticationFailedError,
  IdentityContextRequiredError
} from '../domain/identity-errors.js';
import { promoteVerifiedSubject } from '../internal/trusted-authentication.js';
import {
  authenticationFailed,
  createTrustedAuthenticationResult,
  requireTrustedAuthenticationResult,
  type AuthenticationResult,
  type Authenticator
} from './authenticator.js';
import { requireIdentityContext } from './identity-context.js';

describe('authentication trust boundary', () => {
  it('accepts only internally promoted authenticated results', () => {
    const result = promoteVerifiedSubject('authority-a', 'subject-a', 'human');
    const trusted = requireTrustedAuthenticationResult(result);

    expect(trusted.authenticated).toBe(true);
    if (trusted.authenticated) {
      expect(requireIdentityContext(trusted.context)).toBe(trusted.context);
      expect(trusted.context.principal.type).toBe('human');
    }
  });

  it('rejects a structurally compatible forged result at runtime', () => {
    const forgedContext = { principal: { id: {}, type: 'human' } };
    const forged = {
      authenticated: true,
      context: forgedContext
    } as unknown as AuthenticationResult;

    expect(() => requireTrustedAuthenticationResult(forged)).toThrow(AuthenticationFailedError);
    expect(() => requireIdentityContext(forgedContext)).toThrow(AuthenticationFailedError);
  });

  it('does not grant trust by implementing Authenticator', async () => {
    const adapter: Authenticator = {
      authenticate() {
        return Promise.resolve({
          authenticated: true as const,
          context: { principal: { id: {} as never, type: 'service' as const } }
        });
      }
    };
    const result = await adapter.authenticate(
      AuthenticationEvidence.fromUntrusted('external-secret')
    );
    expect(() => requireTrustedAuthenticationResult(result)).toThrow(AuthenticationFailedError);
  });

  it('rejects forged contexts at trusted promotion and required-context boundaries', () => {
    expect(() => createTrustedAuthenticationResult({} as never)).toThrow(AuthenticationFailedError);
    expect(() => requireIdentityContext(undefined)).toThrow(IdentityContextRequiredError);
  });

  it('represents authentication failure without credential detail', () => {
    const result = requireTrustedAuthenticationResult(authenticationFailed());
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.error.code).toBe('AUTHENTICATION_FAILED');
      expect(result.error.message).not.toContain('secret');
    }
  });
});
