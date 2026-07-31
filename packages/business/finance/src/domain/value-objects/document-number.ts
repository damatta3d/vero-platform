import { DomainValidationError, ValueObject } from '@vero/core-domain';

interface DocumentNumberProps {
  readonly value: string;
}

export class DocumentNumber extends ValueObject<DocumentNumberProps> {
  private constructor(value: string) {
    super({ value });
  }

  static from(value: string): DocumentNumber {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new DomainValidationError(
        'Document number cannot be empty.',
        'FINANCE_DOCUMENT_NUMBER_EMPTY'
      );
    }

    if (normalized.length > 100) {
      throw new DomainValidationError(
        'Document number cannot exceed 100 characters.',
        'FINANCE_DOCUMENT_NUMBER_TOO_LONG'
      );
    }

    return new DocumentNumber(normalized);
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
