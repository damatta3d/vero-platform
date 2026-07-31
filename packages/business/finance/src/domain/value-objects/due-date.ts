import { DomainValidationError, ValueObject } from '@vero/core-domain';

interface DueDateProps {
  readonly isoDate: string;
}

export class DueDate extends ValueObject<DueDateProps> {
  private constructor(date: Date) {
    super({ isoDate: date.toISOString().slice(0, 10) });
  }

  static from(value: Date | string): DueDate {
    let date: Date;

    if (value instanceof Date) {
      date = new Date(value);
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw DueDate.invalid();
      }

      date = new Date(`${value}T00:00:00`);

      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw DueDate.invalid();
      }
    }

    if (Number.isNaN(date.getTime())) {
      throw DueDate.invalid();
    }

    date.setHours(0, 0, 0, 0);
    return new DueDate(date);
  }

  get value(): Date {
    return new Date(`${this.props.isoDate}T00:00:00`);
  }

  isBefore(other: DueDate): boolean {
    return this.props.isoDate < other.props.isoDate;
  }

  isAfter(other: DueDate): boolean {
    return this.props.isoDate > other.props.isoDate;
  }

  daysUntil(other: DueDate): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    return Math.round((other.value.getTime() - this.value.getTime()) / millisecondsPerDay);
  }

  toISODate(): string {
    return this.props.isoDate;
  }

  override toString(): string {
    return this.props.isoDate;
  }

  private static invalid(): DomainValidationError {
    return new DomainValidationError('Invalid due date.', 'FINANCE_DUE_DATE_INVALID');
  }
}
