import { Module, type DynamicModule } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from '@vero/core-configuration';
import {
  CacheHealthAdapter,
  DatabaseHealthAdapter,
  MessagingHealthAdapter
} from './health/dependency-health.adapters.js';
import { HealthController } from './health/health.controller.js';
import { APP_CONFIG } from './app.tokens.js';
import { CatalogModule } from './catalog/catalog.module.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        TerminusModule,
        ...(config.mvp.enabled ? [CatalogModule.register(config)] : []),
        LoggerModule.forRoot({
          pinoHttp: {
            level: config.logLevel,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token'
              ],
              censor: '[REDACTED]'
            }
          }
        })
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        DatabaseHealthAdapter,
        CacheHealthAdapter,
        MessagingHealthAdapter
      ]
    };
  }
}
