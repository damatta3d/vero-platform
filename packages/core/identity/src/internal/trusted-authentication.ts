import type { PrincipalType } from '../domain/principal.js';
import { createTrustedPrincipal } from '../domain/principal.js';
import { createTrustedIdentityContext } from '../application/identity-context.js';
import {
  createTrustedAuthenticationResult,
  type AuthenticationResult
} from '../application/authenticator.js';

export function promoteVerifiedSubject(
  authority: string,
  subject: string,
  type: PrincipalType
): AuthenticationResult {
  const principal = createTrustedPrincipal(authority, subject, type);
  const context = createTrustedIdentityContext(principal);
  return createTrustedAuthenticationResult(context);
}
