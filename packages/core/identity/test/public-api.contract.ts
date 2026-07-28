import {
  AuthenticationEvidence,
  type AuthenticatedPrincipal,
  type IdentityContext,
  type PrincipalId
} from '../src/public-api.js';

AuthenticationEvidence.fromUntrusted('external');

// @ts-expect-error trusted principal factory is intentionally not public
import { createTrustedPrincipal } from '../src/public-api.js';
// @ts-expect-error trusted promotion capability is intentionally not public
import { promoteVerifiedSubject } from '../src/public-api.js';
// @ts-expect-error PrincipalId has no public constructor value
new PrincipalId('external');
// @ts-expect-error AuthenticatedPrincipal has no public constructor value
new AuthenticatedPrincipal();
// @ts-expect-error IdentityContext has no public constructor value
new IdentityContext();

void createTrustedPrincipal;
void promoteVerifiedSubject;
