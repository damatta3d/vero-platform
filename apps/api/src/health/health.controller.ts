import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

import {
  CacheHealthAdapter,
  DatabaseHealthAdapter,
  MessagingHealthAdapter
} from './dependency-health.adapters.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthAdapter) private readonly database: DatabaseHealthAdapter,
    @Inject(CacheHealthAdapter) private readonly cache: CacheHealthAdapter,
    @Inject(MessagingHealthAdapter) private readonly messaging: MessagingHealthAdapter
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.check(),
      () => this.cache.check(),
      () => this.messaging.check()
    ]);
  }
}
