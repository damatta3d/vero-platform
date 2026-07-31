import { Money } from './money.js';

describe('Money', () => {
  it('creates money from cents', () => {
    const money = Money.fromCents(2450);

    expect(money.amountInCents).toBe(2450);
    expect(money.amountInDecimal).toBe(24.5);
  });

  it('creates money from decimal value', () => {
    const money = Money.fromDecimal(24.5);

    expect(money.amountInCents).toBe(2450);
  });

  it('adds two monetary values', () => {
    const result = Money.fromCents(1000).add(Money.fromCents(500));

    expect(result.amountInCents).toBe(1500);
  });

  it('subtracts two monetary values', () => {
    const result = Money.fromCents(1000).subtract(Money.fromCents(400));

    expect(result.amountInCents).toBe(600);
  });

  it('does not allow a negative monetary value', () => {
    expect(() => Money.fromCents(-1)).toThrow('Money cannot be negative');
  });

  it('does not allow subtraction resulting in a negative value', () => {
    expect(() => Money.fromCents(100).subtract(Money.fromCents(200))).toThrow(
      'Money subtraction cannot result in a negative value'
    );
  });

  it('compares monetary values', () => {
    const greater = Money.fromCents(200);
    const smaller = Money.fromCents(100);

    expect(greater.isGreaterThan(smaller)).toBe(true);
    expect(smaller.isLessThan(greater)).toBe(true);
    expect(greater.equals(Money.fromCents(200))).toBe(true);
  });

  it('represents zero money', () => {
    const money = Money.zero();

    expect(money.isZero()).toBe(true);
    expect(money.toString()).toBe('0.00');
  });
});