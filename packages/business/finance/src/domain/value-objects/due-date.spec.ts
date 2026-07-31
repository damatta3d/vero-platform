import { DueDate } from './due-date.js';

describe('DueDate', () => {
  it('creates from string', () => {
    const dueDate = DueDate.from('2026-08-15');

    expect(dueDate.toISODate()).toBe('2026-08-15');
  });

  it('creates from Date', () => {
    const dueDate = DueDate.from(new Date(2026, 7, 15));

    expect(dueDate.toISODate()).toBe('2026-08-15');
  });

  it('compares dates', () => {
    const first = DueDate.from('2026-08-15');
    const second = DueDate.from('2026-08-20');

    expect(first.isBefore(second)).toBe(true);
    expect(second.isAfter(first)).toBe(true);
  });

  it('checks equality', () => {
    const first = DueDate.from('2026-08-15');
    const second = DueDate.from('2026-08-15');

    expect(first.equals(second)).toBe(true);
  });

  it('calculates days until another date', () => {
    const first = DueDate.from('2026-08-15');
    const second = DueDate.from('2026-08-20');

    expect(first.daysUntil(second)).toBe(5);
  });

  it('returns ISO date', () => {
    const dueDate = DueDate.from('2026-08-15');

    expect(dueDate.toISODate()).toBe('2026-08-15');
  });

  it('returns string representation', () => {
    const dueDate = DueDate.from('2026-08-15');

    expect(dueDate.toString()).toBe('2026-08-15');
  });

  it('rejects invalid date', () => {
    expect(() => DueDate.from('abc')).toThrow();
  });
});
