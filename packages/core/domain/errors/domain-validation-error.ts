import { DomainError, type DomainErrorDetails } from './domain-error.js';

export class DomainValidationError extends DomainError {
  constructor(message: string, code = 'DOMAIN_VALIDATION_ERROR', details?: DomainErrorDetails) {
    super(message, code, details);
  }
}
