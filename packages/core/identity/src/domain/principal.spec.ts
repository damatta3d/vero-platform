import { createTrustedPrincipal } from './principal.js';

describe('AuthenticatedPrincipal', () => {
  it.each(['human', 'service'] as const)(
    'creates an immutable %s principal',
    (type) => {
      const principal = createTrustedPrincipal(
        'trusted-authority',
        'subject-1',
        type
      );
      expect(principal.type).toBe(type);
      expect(Object.isFrozen(principal)).toBe(true);
      expect(Object.isFrozen(principal.id)).toBe(true);
    }
  );

  it('qualifies subject identity by authority', () => {
    const first = createTrustedPrincipal(
      'authority-a',
      'same-subject',
      'human'
    );
    const second = createTrustedPrincipal(
      'authority-b',
      'same-subject',
      'human'
    );
    const same = createTrustedPrincipal('authority-a', 'same-subject', 'human');

    expect(first.id.equals(second.id)).toBe(false);
    expect(first.id.equals(same.id)).toBe(true);
  });

  it.each([
    ['', 'subject'],
    ['authority', '']
  ])('rejects incomplete trusted identity', (authority, subject) => {
    expect(() => createTrustedPrincipal(authority, subject, 'human')).toThrow();
  });
});
