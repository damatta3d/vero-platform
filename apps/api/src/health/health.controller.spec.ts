import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller.js';
import {
  CacheHealthAdapter,
  DatabaseHealthAdapter,
  MessagingHealthAdapter
} from './dependency-health.adapters.js';

describe(HealthController.name, () => {
  it('reports liveness without probing external dependencies', async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: DatabaseHealthAdapter, useValue: { check: jest.fn() } },
        { provide: CacheHealthAdapter, useValue: { check: jest.fn() } },
        { provide: MessagingHealthAdapter, useValue: { check: jest.fn() } }
      ]
    }).compile();

    const result = await module.get(HealthController).live();
    expect(result.status).toBe('ok');
  });
});
