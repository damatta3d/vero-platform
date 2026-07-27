import { Inject, Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';

import type { AppConfig } from '@vero/core-configuration';
import { RedisHealthClient } from '@vero/infrastructure-cache';
import { PostgresHealthClient } from '@vero/infrastructure-database';
import { RabbitMqHealthClient } from '@vero/infrastructure-messaging';
import { APP_CONFIG } from '../app.tokens.js';

type HealthAdapter = { check(): Promise<HealthIndicatorResult> };

@Injectable()
export class DatabaseHealthAdapter implements HealthAdapter {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async check(): Promise<HealthIndicatorResult> {
    if (!this.config.postgres.enabled) return { postgres: { status: 'up', skipped: true } };
    return new PostgresHealthClient(this.config.postgres.url).check();
  }
}

@Injectable()
export class CacheHealthAdapter implements HealthAdapter {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async check(): Promise<HealthIndicatorResult> {
    if (!this.config.redis.enabled) return { redis: { status: 'up', skipped: true } };
    return new RedisHealthClient(this.config.redis.url).check();
  }
}

@Injectable()
export class MessagingHealthAdapter implements HealthAdapter {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async check(): Promise<HealthIndicatorResult> {
    if (!this.config.rabbitmq.enabled) return { rabbitmq: { status: 'up', skipped: true } };
    return new RabbitMqHealthClient(this.config.rabbitmq.url).check();
  }
}
