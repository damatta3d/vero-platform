import { formatOperationalOrderNumber } from './order-number';

describe('formatOperationalOrderNumber', () => {
  it.each([
    [1, '00001'],
    [427, '00427'],
    [99999, '99999']
  ])('formats %s as a stable five-digit label', (value, expected) => {
    expect(formatOperationalOrderNumber(value)).toBe(expected);
  });

  it.each([null, undefined, 0, -1, 100000, 1.5, Number.NaN])(
    'rejects invalid or unavailable operational number %s',
    (value) => {
      expect(formatOperationalOrderNumber(value)).toBeNull();
    }
  );
});
