export { actionRef, resourceRef, type AccessReference } from './domain/access-reference.js';
export {
  AccessContextConsumedError,
  AccessDeniedError,
  AccessError,
  InvalidAccessReferenceError
} from './domain/access-errors.js';
export {
  consumeAuthorizedAccess,
  createAccessAuthorizer,
  type AccessAuthorizer,
  type AccessEvaluation,
  type AccessEvaluator,
  type AuthorizationRequest,
  type AuthorizedAccessContext
} from './application/access-authorizer.js';
