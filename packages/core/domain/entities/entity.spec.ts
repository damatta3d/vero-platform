import { Entity } from './entity.js';
import { UniqueEntityId } from '../ids/unique-entity-id.js';

class TestEntity extends Entity<UniqueEntityId> {
  constructor(id: UniqueEntityId) {
    super(id);
  }
}

class OtherEntity extends Entity<UniqueEntityId> {
  constructor(id: UniqueEntityId) {
    super(id);
  }
}

describe('Entity', () => {
  it('exposes its identity', () => {
    const id = UniqueEntityId.create('44c756a9-f689-4bca-a9d4-8ba31f606ca9');

    expect(new TestEntity(id).id).toBe(id);
  });

  it('compares entities by type and identity', () => {
    const id = UniqueEntityId.create('44c756a9-f689-4bca-a9d4-8ba31f606ca9');
    const entity = new TestEntity(id);

    expect(entity.equals(entity)).toBe(true);
    expect(entity.equals(new TestEntity(UniqueEntityId.create(id.toString())))).toBe(true);
    expect(
      entity.equals(new TestEntity(UniqueEntityId.create('aee9b334-fd35-4c28-8fa7-e4595d9f7755')))
    ).toBe(false);
    expect(entity.equals(new OtherEntity(id))).toBe(false);
    expect(entity.equals(null)).toBe(false);
  });

  it('supports primitive identifiers during incremental migration', () => {
    class LegacyEntity extends Entity<string> {
      constructor(id: string) {
        super(id);
      }
    }

    expect(new LegacyEntity('legacy-1').equals(new LegacyEntity('legacy-1'))).toBe(true);
  });
});
