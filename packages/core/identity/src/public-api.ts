export { AuthenticationEvidence } from './domain/authentication-evidence.js';
export {
  AuthenticationEvidenceRequiredError,
  AuthenticationFailedError,
  IdentityContextRequiredError,
  IdentityError,
  InvalidAuthenticationEvidenceError
} from './domain/identity-errors.js';
export type {
  AuthenticatedPrincipal,
  PrincipalId,
  PrincipalType
} from './domain/principal.js';
export {
  requireIdentityContext,
  type IdentityContext
} from './application/identity-context.js';
export {
  requireTrustedAuthenticationResult,
  type AuthenticationResult,
  type Authenticator
} from './application/authenticator.js';
