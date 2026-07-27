import { ExecutionContextStore } from './execution-context.store.js';

describe(ExecutionContextStore.name, () => {
  it('preserves context across asynchronous boundaries', async () => {
    const store = new ExecutionContextStore();
    const observed = await store.run({ correlationId: 'cor-1' }, async () => {
      await Promise.resolve();
      return store.get()?.correlationId;
    });
    expect(observed).toBe('cor-1');
    expect(store.get()).toBeUndefined();
  });
});
