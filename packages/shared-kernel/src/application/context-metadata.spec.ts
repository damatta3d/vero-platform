import type { ContextMetadata } from './context-metadata.js';

describe('ContextMetadata', () => {
  it('remains a runtime-agnostic immutable contract', () => {
    const context: ContextMetadata = Object.freeze({ correlationId: 'cor-1' });
    expect(context).toEqual({ correlationId: 'cor-1' });
    expect(Object.isFrozen(context)).toBe(true);
  });
});
