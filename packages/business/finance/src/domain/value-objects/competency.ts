export class Competency {
  private constructor(
    private readonly competencyYear: number,
    private readonly competencyMonth: number
  ) {}

  static from(value: string): Competency {
    const normalizedValue = value.trim();

    const match = /^(\d{4})-(\d{2})$/.exec(normalizedValue);

    if (!match) {
      throw new Error('Invalid competency format. Expected YYYY-MM.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) {
      throw new Error('Invalid competency month. Expected a value between 01 and 12.');
    }

    return new Competency(year, month);
  }

  get year(): number {
    return this.competencyYear;
  }

  get month(): number {
    return this.competencyMonth;
  }

  equals(other: Competency): boolean {
    return (
      this.competencyYear === other.competencyYear && this.competencyMonth === other.competencyMonth
    );
  }

  toString(): string {
    return `${this.competencyYear}-${String(this.competencyMonth).padStart(2, '0')}`;
  }
}
