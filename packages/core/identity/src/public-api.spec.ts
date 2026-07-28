import * as publicApi from './public-api.js';

describe('core-identity public API', () => {
  it('exports only the deliberate runtime surface', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'AuthenticationEvidence',
      'AuthenticationEvidenceRequiredError',
      'AuthenticationFailedError',
      'IdentityContextRequiredError',
      'IdentityError',
      'InvalidAuthenticationEvidenceError',
      'requireIdentityContext',
      'requireTrustedAuthenticationResult'
    ]);
    expect(publicApi).not.toHaveProperty('promoteVerifiedSubject');
    expect(publicApi).not.toHaveProperty('createTrustedPrincipal');
    expect(publicApi).not.toHaveProperty('AuthorizedTenantContext');
    expect(publicApi).not.toHaveProperty('User');
  });
});
