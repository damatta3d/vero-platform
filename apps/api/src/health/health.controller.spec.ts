import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller.js';
import {
  CacheHealthAdapter,
  DatabaseHealthAdapter,
  MessagingHealthAdapter
} from './dependency-health.adapters.js';

describe(HealthController.name, () => {
  const databaseCheck = jest.fn();
  const cacheCheck = jest.fn();
  const messagingCheck = jest.fn();

  async function createController() {
    const module = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: DatabaseHealthAdapter, useValue: { check: databaseCheck } },
        { provide: CacheHealthAdapter, useValue: { check: cacheCheck } },
        { provide: MessagingHealthAdapter, useValue: { check: messagingCheck } }
      ]
    }).compile();

    return module.get(HealthController);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    databaseCheck.mockResolvedValue({ postgres: { status: 'up' } });
    cacheCheck.mockResolvedValue({ redis: { status: 'up' } });
    messagingCheck.mockResolvedValue({ rabbitmq: { status: 'up' } });
  });

  it('reports liveness without probing external dependencies', async () => {
    const controller = await createController();
    const result = await controller.live();

    expect(result.status).toBe('ok');
    expect(databaseCheck).not.toHaveBeenCalled();
    expect(cacheCheck).not.toHaveBeenCalled();
    expect(messagingCheck).not.toHaveBeenCalled();
  });

  it('reports readiness only after probing all required dependencies', async () => {
    const controller = await createController();
    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(databaseCheck).toHaveBeenCalledTimes(1);
    expect(cacheCheck).toHaveBeenCalledTimes(1);
    expect(messagingCheck).toHaveBeenCalledTimes(1);
  });

  it('fails readiness when a required dependency is unavailable', async () => {
    databaseCheck.mockResolvedValue({ postgres: { status: 'down' } });
    const controller = await createController();

    await expect(controller.ready()).rejects.toThrow();
  });
});
