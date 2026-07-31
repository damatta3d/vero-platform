import { DomainValidationError, ValueObject } from '@vero/core-domain';

interface CompetencyProps {
  readonly year: number;
  readonly month: number;
}

export class Competency extends ValueObject<CompetencyProps> {
  private constructor(year: number, month: number) {
    super({ year, month });
  }

  static from(value: string): Competency {
    const normalizedValue = value.trim();
    const match = /^(\d{4})-(\d{2})$/.exec(normalizedValue);

    if (!match) {
      throw new DomainValidationError(
        'Invalid competency format. Expected YYYY-MM.',
        'FINANCE_COMPETENCY_FORMAT_INVALID'
      );
    }

    const year = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) {
      throw new DomainValidationError(
        'Invalid competency month. Expected a value between 01 and 12.',
        'FINANCE_COMPETENCY_MONTH_INVALID'
      );
    }

    return new Competency(year, month);
  }

  get year(): number {
    return this.props.year;
  }

  get month(): number {
    return this.props.month;
  }

  override toString(): string {
    return `${this.props.year}-${String(this.props.month).padStart(2, '0')}`;
  }
}
