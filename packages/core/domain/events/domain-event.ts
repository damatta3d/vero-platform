import type { UniqueEntityId } from '../ids/unique-entity-id.js';

export interface DomainEvent {
  readonly eventId: UniqueEntityId;
  readonly aggregateId: UniqueEntityId;
  readonly eventName: string;
  readonly occurredAt: Date;
}
