import { DomainValidationError } from '../errors/domain-validation-error.js';
import { UniqueEntityId } from './unique-entity-id.js';

describe('UniqueEntityId', () => {
  it('generates a UUID automatically', () => {
    expect(UniqueEntityId.create().toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('normalizes and compares provided UUIDs', () => {
    const id = UniqueEntityId.create('44C756A9-F689-4BCA-A9D4-8BA31F606CA9');

    expect(id.toValue()).toBe('44c756a9-f689-4bca-a9d4-8ba31f606ca9');
    expect(id.equals(UniqueEntityId.create('44c756a9-f689-4bca-a9d4-8ba31f606ca9'))).toBe(true);
  });

  it('rejects invalid identifiers with a domain validation error', () => {
    expect(() => UniqueEntityId.create('not-a-uuid')).toThrow(DomainValidationError);
  });
});
