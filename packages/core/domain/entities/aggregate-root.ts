import type { DomainEvent } from '../events/domain-event.js';
import { Entity } from './entity.js';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly recordedEvents: DomainEvent[] = [];

  get domainEvents(): readonly DomainEvent[] {
    return [...this.recordedEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this.recordedEvents.push(event);
  }

  clearDomainEvents(): void {
    this.recordedEvents.length = 0;
  }
}