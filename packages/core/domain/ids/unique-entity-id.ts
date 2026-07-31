import { randomUUID } from 'node:crypto';

import { DomainValidationError } from '../errors/domain-validation-error.js';
import { ValueObject } from '../value-objects/value-object.js';

interface UniqueEntityIdProps {
  readonly value: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UniqueEntityId extends ValueObject<UniqueEntityIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(): UniqueEntityId {
    return new UniqueEntityId(randomUUID());
  }

  static from(value: string): UniqueEntityId {
    const normalized = value.trim().toLowerCase();

    if (!UUID_PATTERN.test(normalized)) {
      throw new DomainValidationError(
        'Unique entity id must be a valid UUID.',
        'UNIQUE_ENTITY_ID_INVALID'
      );
    }

    return new UniqueEntityId(normalized);
  }

  override toString(): string {
    return this.props.value;
  }

  toValue(): string {
    return this.props.value;
  }
}