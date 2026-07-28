import { AuthenticationEvidence } from '../domain/authentication-evidence.js';
import { AuthenticationFailedError } from '../domain/identity-errors.js';
import { promoteVerifiedSubject } from '../internal/trusted-authentication.js';
import {
  authenticationFailed,
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
    const forged = {
      authenticated: true,
      context: { principal: { id: {}, type: 'human' } }
    } as unknown as AuthenticationResult;

    expect(() => requireTrustedAuthenticationResult(forged)).toThrow(
      AuthenticationFailedError
    );
    expect(() => requireIdentityContext(forged.context)).toThrow(AuthenticationFailedError);
  });

  it('does not grant trust by implementing Authenticator', async () => {
    const adapter: Authenticator = {
      async authenticate() {
        return {
          authenticated: true,
          context: { principal: { id: {} as never, type: 'service' } }
        };
      }
    };
    const result = await adapter.authenticate(
      AuthenticationEvidence.fromUntrusted('external-secret')
    );
    expect(() => requireTrustedAuthenticationResult(result)).toThrow(
      AuthenticationFailedError
    );
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
