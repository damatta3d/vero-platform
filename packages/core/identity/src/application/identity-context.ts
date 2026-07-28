import type { AuthenticatedPrincipal } from '../domain/principal.js';
import { isTrustedPrincipal } from '../domain/principal.js';
import {
  AuthenticationFailedError,
  IdentityContextRequiredError
} from '../domain/identity-errors.js';

const trustedContexts = new WeakSet<object>();

export interface IdentityContext {
  readonly principal: AuthenticatedPrincipal;
}

export function createTrustedIdentityContext(
  principal: AuthenticatedPrincipal
): IdentityContext {
  if (!isTrustedPrincipal(principal)) throw new AuthenticationFailedError();
  const context = Object.freeze({ principal });
  trustedContexts.add(context);
  return context;
}

export function isTrustedIdentityContext(
  value: unknown
): value is IdentityContext {
  return (
    typeof value === 'object' && value !== null && trustedContexts.has(value)
  );
}

export function requireIdentityContext(value: unknown): IdentityContext {
  if (value === undefined || value === null)
    throw new IdentityContextRequiredError();
  if (!isTrustedIdentityContext(value)) throw new AuthenticationFailedError();
  return value;
}
