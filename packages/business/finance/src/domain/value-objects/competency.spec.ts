import { Competency } from './competency.js';

describe('Competency', () => {
  it('creates a valid competency', () => {
    const competency = Competency.from('2026-07');

    expect(competency).toBeInstanceOf(Competency);
  });

  it('returns the correct year', () => {
    const competency = Competency.from('2026-07');

    expect(competency.year).toBe(2026);
  });

  it('returns the correct month', () => {
    const competency = Competency.from('2026-07');

    expect(competency.month).toBe(7);
  });

  it('returns true when competencies are equal', () => {
    const first = Competency.from('2026-07');
    const second = Competency.from('2026-07');

    expect(first.equals(second)).toBe(true);
  });

  it('returns false when competencies are different', () => {
    const first = Competency.from('2026-07');
    const second = Competency.from('2026-08');

    expect(first.equals(second)).toBe(false);
  });

  it('returns the formatted competency', () => {
    const competency = Competency.from('2026-07');

    expect(competency.toString()).toBe('2026-07');
  });

  it('rejects month 00', () => {
    expect(() => Competency.from('2026-00')).toThrow();
  });

  it('rejects month 13', () => {
    expect(() => Competency.from('2026-13')).toThrow();
  });

  it('rejects invalid format', () => {
    expect(() => Competency.from('2026/07')).toThrow();
    expect(() => Competency.from('26-07')).toThrow();
    expect(() => Competency.from('202607')).toThrow();
  });
});
