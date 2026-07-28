/* Test-only owner fixtures are intentionally imported from internals to create trusted contexts. */
/* eslint-disable @nx/enforce-module-boundaries */
import { promoteVerifiedSubject } from '../../../identity/src/internal/trusted-authentication.js';
import { requireTrustedAuthenticationResult } from '../../../identity/src/application/authenticator.js';
import { createTenantIdFromTrustedValue } from '../../../tenancy/src/domain/tenant-id.js';
import { createResolvedTenantContext } from '../../../tenancy/src/application/resolved-tenant-context.js';
import { actionRef, resourceRef } from '../domain/access-reference.js';
import { AccessContextConsumedError, AccessDeniedError } from '../domain/access-errors.js';
import {
  consumeAuthorizedAccess,
  createAccessAuthorizer,
  type AccessEvaluator,
  type AuthorizationRequest
} from './access-authorizer.js';

function request(): AuthorizationRequest {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'user-1', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return {
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue('tenant-1')),
    action: actionRef('catalog.product.create'),
    resource: resourceRef('catalog.product')
  };
}

describe('AccessAuthorizer', () => {
  it('authorizes an exact trusted request and allows one consumption', async () => {
    const evaluator: AccessEvaluator = {
      evaluate: () =>
        Promise.resolve({
          outcome: 'allow',
          reason: 'policy-match',
          policyRevision: 'santo-parma-mvp-v1'
        })
    };
    const context = await createAccessAuthorizer(evaluator).authorize(request());

    expect(consumeAuthorizedAccess(context)).toBe(context);
    expect(() => consumeAuthorizedAccess(context)).toThrow(AccessContextConsumedError);
  });

  it.each([
    { outcome: 'deny' as const, reason: 'missing-policy', policyRevision: 'v1' },
    { outcome: 'allow' as const, reason: 'invalid-revision', policyRevision: ' ' }
  ])('denies non-authoritative evaluation %#', async (evaluation) => {
    const authorizer = createAccessAuthorizer({ evaluate: () => Promise.resolve(evaluation) });
    await expect(authorizer.authorize(request())).rejects.toThrow(AccessDeniedError);
  });

  it('denies evaluator failures', async () => {
    const authorizer = createAccessAuthorizer({
      evaluate: () => Promise.reject(new Error('provider detail must not escape'))
    });
    await expect(authorizer.authorize(request())).rejects.toThrow(AccessDeniedError);
  });

  it('rejects forged contexts and decisions', async () => {
    const forged = { ...request(), identity: { principal: request().identity.principal } };
    const authorizer = createAccessAuthorizer({
      evaluate: () => Promise.resolve({ outcome: 'allow', reason: 'ok', policyRevision: 'v1' })
    });

    await expect(authorizer.authorize(forged as AuthorizationRequest)).rejects.toThrow();
    expect(() => consumeAuthorizedAccess({ request: request(), policyRevision: 'v1' })).toThrow(
      AccessDeniedError
    );
  });
});
