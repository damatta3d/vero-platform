export class DocumentNumber {
  private constructor(private readonly document: string) {}

  static from(value: string): DocumentNumber {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error('Document number cannot be empty.');
    }

    if (normalized.length > 100) {
      throw new Error('Document number cannot exceed 100 characters.');
    }

    return new DocumentNumber(normalized);
  }

  get value(): string {
    return this.document;
  }

  equals(other: DocumentNumber): boolean {
    return this.document === other.document;
  }

  toString(): string {
    return this.document;
  }
}
