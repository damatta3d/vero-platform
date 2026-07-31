import { DomainError, type DomainErrorDetails } from './domain-error.js';

export class InvariantViolationError extends DomainError {
  constructor(message: string, code = 'INVARIANT_VIOLATION', details?: DomainErrorDetails) {
    super(message, code, details);
  }
}
