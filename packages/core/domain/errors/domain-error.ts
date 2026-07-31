export type DomainErrorDetails = Readonly<Record<string, unknown>>;

export abstract class DomainError extends Error {
  protected constructor(
    message: string,
    public readonly code: string,
    public readonly details?: DomainErrorDetails
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);

    this.name = new.target.name;

    if (details) {
      Object.freeze(details);
    }
  }
}