import { requireIdentityContext, type IdentityContext } from '@vero/core-identity';
import { requireResolvedTenantContext, type ResolvedTenantContext } from '@vero/core-tenancy';
import type { AccessReference } from '../domain/access-reference.js';
import { AccessContextConsumedError, AccessDeniedError } from '../domain/access-errors.js';

export interface AuthorizationRequest {
  readonly identity: IdentityContext;
  readonly tenant: ResolvedTenantContext;
  readonly action: AccessReference;
  readonly resource: AccessReference;
}

export interface AccessEvaluation {
  readonly outcome: 'allow' | 'deny';
  readonly reason: string;
  readonly policyRevision: string;
}

export interface AccessEvaluator {
  evaluate(request: AuthorizationRequest): Promise<AccessEvaluation>;
}

export interface AuthorizedAccessContext {
  readonly request: AuthorizationRequest;
  readonly policyRevision: string;
}

export interface AccessAuthorizer {
  authorize(request: AuthorizationRequest): Promise<AuthorizedAccessContext>;
}

const authorizedContexts = new WeakSet<object>();
const consumedContexts = new WeakSet<object>();

function validateRequest(request: AuthorizationRequest): AuthorizationRequest {
  requireIdentityContext(request.identity);
  requireResolvedTenantContext(request.tenant);
  return Object.freeze({
    identity: request.identity,
    tenant: request.tenant,
    action: request.action,
    resource: request.resource
  });
}

export function createAccessAuthorizer(evaluator: AccessEvaluator): AccessAuthorizer {
  return Object.freeze({
    async authorize(candidate: AuthorizationRequest): Promise<AuthorizedAccessContext> {
      const request = validateRequest(candidate);
      let evaluation: AccessEvaluation;
      try {
        evaluation = await evaluator.evaluate(request);
      } catch {
        throw new AccessDeniedError();
      }
      if (evaluation.outcome !== 'allow' || evaluation.policyRevision.trim().length === 0) {
        throw new AccessDeniedError();
      }
      const context = Object.freeze({
        request,
        policyRevision: evaluation.policyRevision
      });
      authorizedContexts.add(context);
      return context;
    }
  });
}

export function consumeAuthorizedAccess(value: unknown): AuthorizedAccessContext {
  if (typeof value !== 'object' || value === null || !authorizedContexts.has(value)) {
    throw new AccessDeniedError();
  }
  if (consumedContexts.has(value)) throw new AccessContextConsumedError();
  consumedContexts.add(value);
  return value as AuthorizedAccessContext;
}
