export class DueDate {
  private readonly dueDate: Date;

  private constructor(date: Date) {
    this.dueDate = new Date(date);
    this.dueDate.setHours(0, 0, 0, 0);
  }

  static from(value: Date | string): DueDate {
    let date: Date;

    if (value instanceof Date) {
      date = new Date(value);
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Invalid due date.');
      }

      date = new Date(`${value}T00:00:00`);

      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid due date.');
      }

      // Validação para impedir datas como 2026-02-30
      if (date.toISOString().slice(0, 10) !== value) {
        throw new Error('Invalid due date.');
      }
    }

    return new DueDate(date);
  }

  get value(): Date {
    return new Date(this.dueDate);
  }

  isBefore(other: DueDate): boolean {
    return this.dueDate.getTime() < other.dueDate.getTime();
  }

  isAfter(other: DueDate): boolean {
    return this.dueDate.getTime() > other.dueDate.getTime();
  }

  equals(other: DueDate): boolean {
    return this.dueDate.getTime() === other.dueDate.getTime();
  }

  daysUntil(other: DueDate): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    return Math.round(
      (other.dueDate.getTime() - this.dueDate.getTime()) /
        millisecondsPerDay
    );
  }

  toISODate(): string {
    return this.dueDate.toISOString().slice(0, 10);
  }

  toString(): string {
    return this.toISODate();
  }
}