import { BusinessRuleViolationError, DomainValidationError, ValueObject } from '@vero/core-domain';

interface MoneyProps {
  readonly cents: number;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(cents: number) {
    super({ cents });
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new DomainValidationError(
        'Money must be represented by an integer number of cents',
        'FINANCE_MONEY_CENTS_INVALID'
      );
    }

    if (cents < 0) {
      throw new DomainValidationError('Money cannot be negative', 'FINANCE_MONEY_NEGATIVE');
    }

    return new Money(cents);
  }

  static fromDecimal(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new DomainValidationError(
        'Money amount must be finite',
        'FINANCE_MONEY_AMOUNT_INVALID'
      );
    }

    if (amount < 0) {
      throw new DomainValidationError('Money cannot be negative', 'FINANCE_MONEY_NEGATIVE');
    }

    return Money.fromCents(Math.round(amount * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  get amountInCents(): number {
    return this.props.cents;
  }

  get amountInDecimal(): number {
    return this.props.cents / 100;
  }

  add(other: Money): Money {
    return Money.fromCents(this.props.cents + other.props.cents);
  }

  subtract(other: Money): Money {
    const result = this.props.cents - other.props.cents;

    if (result < 0) {
      throw new BusinessRuleViolationError(
        'Money subtraction cannot result in a negative value',
        'FINANCE_MONEY_SUBTRACTION_NEGATIVE'
      );
    }

    return Money.fromCents(result);
  }

  multiply(multiplier: number): Money {
    if (!Number.isFinite(multiplier) || multiplier < 0) {
      throw new DomainValidationError(
        'Money multiplier must be a non-negative finite number',
        'FINANCE_MONEY_MULTIPLIER_INVALID'
      );
    }

    return Money.fromCents(Math.round(this.props.cents * multiplier));
  }

  isZero(): boolean {
    return this.props.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.props.cents > other.props.cents;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.props.cents >= other.props.cents;
  }

  isLessThan(other: Money): boolean {
    return this.props.cents < other.props.cents;
  }

  override toString(): string {
    return this.amountInDecimal.toFixed(2);
  }
}
