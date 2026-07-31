export class Money {
  private constructor(private readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new Error('Money must be represented by an integer number of cents');
    }

    if (cents < 0) {
      throw new Error('Money cannot be negative');
    }

    return new Money(cents);
  }

  static fromDecimal(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be finite');
    }

    if (amount < 0) {
      throw new Error('Money cannot be negative');
    }

    return Money.fromCents(Math.round(amount * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  get amountInCents(): number {
    return this.cents;
  }

  get amountInDecimal(): number {
    return this.cents / 100;
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    const result = this.cents - other.cents;

    if (result < 0) {
      throw new Error('Money subtraction cannot result in a negative value');
    }

    return Money.fromCents(result);
  }

  multiply(multiplier: number): Money {
    if (!Number.isFinite(multiplier) || multiplier < 0) {
      throw new Error('Money multiplier must be a non-negative finite number');
    }

    return Money.fromCents(Math.round(this.cents * multiplier));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.cents >= other.cents;
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toString(): string {
    return this.amountInDecimal.toFixed(2);
  }
}