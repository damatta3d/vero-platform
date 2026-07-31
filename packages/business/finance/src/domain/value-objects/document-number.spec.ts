import { DocumentNumber } from './document-number.js';

describe('DocumentNumber', () => {
  it('creates a valid document number', () => {
    const document = DocumentNumber.from('NF-000123');

    expect(document.value).toBe('NF-000123');
  });

  it('trims surrounding whitespace', () => {
    const document = DocumentNumber.from('   NF-000123   ');

    expect(document.value).toBe('NF-000123');
  });

  it('compares document numbers', () => {
    const first = DocumentNumber.from('ABC123');
    const second = DocumentNumber.from('ABC123');
    const third = DocumentNumber.from('XYZ999');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(third)).toBe(false);
  });

  it('returns the string representation', () => {
    const document = DocumentNumber.from('NF-2026-001');

    expect(document.toString()).toBe('NF-2026-001');
  });

  it('rejects empty values', () => {
    expect(() => DocumentNumber.from('')).toThrow('Document number cannot be empty.');
  });

  it('rejects blank values', () => {
    expect(() => DocumentNumber.from('     ')).toThrow('Document number cannot be empty.');
  });

  it('rejects values longer than 100 characters', () => {
    const value = 'A'.repeat(101);

    expect(() => DocumentNumber.from(value)).toThrow(
      'Document number cannot exceed 100 characters.'
    );
  });
});
