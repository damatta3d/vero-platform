import { ValueObject } from './value-object.js';

interface TestProps {
  readonly label: string;
  readonly metadata: {
    readonly count: number;
  };
  readonly values: readonly number[];
  readonly occurredAt: Date;
}

class TestValueObject extends ValueObject<TestProps> {
  constructor(props: TestProps) {
    super(props);
  }

  get label(): string {
    return this.props.label;
  }
}

describe('ValueObject', () => {
  it('compares values structurally', () => {
    const first = new TestValueObject({
      label: 'VERO',
      metadata: { count: 1 },
      values: [1, 2],
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    });
    const equal = new TestValueObject({
      label: 'VERO',
      metadata: { count: 1 },
      values: [1, 2],
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    });
    const different = new TestValueObject({
      label: 'VERO',
      metadata: { count: 2 },
      values: [1, 2],
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    });

    expect(first.equals(equal)).toBe(true);
    expect(first.equals(different)).toBe(false);
    expect(first.equals(undefined)).toBe(false);
  });

  it('detects structural differences across supported property shapes', () => {
    const baseline = new TestValueObject({
      label: 'VERO',
      metadata: { count: 1 },
      values: [1, 2],
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    });

    expect(
      baseline.equals(
        new TestValueObject({
          label: 'VERO',
          metadata: { count: 1 },
          values: [1],
          occurredAt: new Date('2026-07-30T12:00:00.000Z')
        })
      )
    ).toBe(false);
    expect(
      baseline.equals(
        new TestValueObject({
          label: 'VERO',
          metadata: { count: 1 },
          values: [1, 2],
          occurredAt: new Date('2026-07-31T12:00:00.000Z')
        })
      )
    ).toBe(false);
  });

  it('keeps its property bag immutable', () => {
    const value = new TestValueObject({
      label: 'VERO',
      metadata: { count: 1 },
      values: [],
      occurredAt: new Date('2026-07-30T12:00:00.000Z')
    });

    expect(value.label).toBe('VERO');
    expect(Object.isFrozen((value as unknown as { props: object }).props)).toBe(true);
  });
});
