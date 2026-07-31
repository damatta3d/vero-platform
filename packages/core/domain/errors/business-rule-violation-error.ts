import { DomainError, type DomainErrorDetails } from './domain-error.js';

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION', details?: DomainErrorDetails) {
    super(message, code, details);
  }
}
