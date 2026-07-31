interface Equatable<T> {
  equals(other: T): boolean;
}

function isEquatable<T>(value: T): value is T & Equatable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'equals' in value &&
    typeof value.equals === 'function'
  );
}

export abstract class Entity<TId> {
  protected constructor(private readonly entityId: TId) {}

  get id(): TId {
    return this.entityId;
  }

  equals(other: Entity<TId> | null | undefined): boolean {
    if (this === other) {
      return true;
    }

    if (!other || this.constructor !== other.constructor) {
      return false;
    }

    return isEquatable(this.entityId)
      ? this.entityId.equals(other.entityId)
      : Object.is(this.entityId, other.entityId);
  }
}
