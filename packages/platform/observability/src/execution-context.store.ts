import { AsyncLocalStorage } from 'node:async_hooks';

import type { ContextMetadata } from '@vero/shared-kernel';

export class ExecutionContextStore {
  private readonly storage = new AsyncLocalStorage<ContextMetadata>();

  run<T>(context: ContextMetadata, callback: () => T): T {
    return this.storage.run(Object.freeze({ ...context }), callback);
  }

  get(): ContextMetadata | undefined {
    return this.storage.getStore();
  }
}

export const executionContextStore = new ExecutionContextStore();
