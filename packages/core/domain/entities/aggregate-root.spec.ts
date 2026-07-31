import type { DomainEvent } from '../events/domain-event.js';
import { UniqueEntityId } from '../ids/unique-entity-id.js';
import { AggregateRoot } from './aggregate-root.js';

class TestAggregate extends AggregateRoot<UniqueEntityId> {
  constructor(id: UniqueEntityId) {
    super(id);
  }

  record(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

describe('AggregateRoot', () => {
  it('records and clears domain events without exposing mutable state', () => {
    const aggregateId = UniqueEntityId.create('44c756a9-f689-4bca-a9d4-8ba31f606ca9');
    const event: DomainEvent = {
      eventId: UniqueEntityId.create('aee9b334-fd35-4c28-8fa7-e4595d9f7755'),
      aggregateId,
      eventName: 'TestAggregateCreated',
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    };
    const aggregate = new TestAggregate(aggregateId);

    aggregate.record(event);
    const snapshot = aggregate.domainEvents;

    expect(snapshot).toEqual([event]);
    expect(snapshot).not.toBe(aggregate.domainEvents);

    aggregate.clearDomainEvents();

    expect(aggregate.domainEvents).toEqual([]);
    expect(snapshot).toEqual([event]);
  });
});
