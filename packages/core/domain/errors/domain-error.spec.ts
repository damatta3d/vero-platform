import { BusinessRuleViolationError } from './business-rule-violation-error.js';
import { DomainError } from './domain-error.js';
import { DomainValidationError } from './domain-validation-error.js';
import { InvariantViolationError } from './invariant-violation-error.js';

describe('DomainError', () => {
  it.each([
    new DomainValidationError('Invalid value'),
    new BusinessRuleViolationError('Rule rejected'),
    new InvariantViolationError('Invariant rejected')
  ])('provides a typed immutable error contract', (error) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(error.constructor.name);
    expect(error.code).toBeTruthy();
  });

  it('preserves an explicit code and details', () => {
    const details = { field: 'amountCents' };
    const error = new DomainValidationError('Invalid amount', 'FINANCE_AMOUNT_INVALID', details);

    expect(error.code).toBe('FINANCE_AMOUNT_INVALID');
    expect(error.details).toEqual(details);
    expect(Object.isFrozen(details)).toBe(true);
  });
});
