import { randomUUID } from 'node:crypto';
import { Inject, Module, type DynamicModule, type OnApplicationShutdown } from '@nestjs/common';

import { CatalogService, type CatalogRepository } from '@vero/business-catalog';
import type { AppConfig } from '@vero/core-configuration';
import { createDatabaseClient, PrismaCatalogRepository } from '@vero/infrastructure-database';
import { APP_CONFIG } from '../app.tokens.js';
import { CatalogController } from './catalog.controller.js';
import { CATALOG_REPOSITORY, DATABASE_CLIENT } from './catalog.tokens.js';
import { MvpSecurityService } from './mvp-security.service.js';
import { MvpPageController } from './mvp-page.controller.js';

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CLIENT) private readonly client: DatabaseClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}

@Module({})
export class CatalogModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: CatalogModule,
      controllers: [CatalogController, MvpPageController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        {
          provide: DATABASE_CLIENT,
          useFactory: () => createDatabaseClient(config.postgres.url)
        },
        {
          provide: CATALOG_REPOSITORY,
          inject: [DATABASE_CLIENT],
          useFactory: (client: DatabaseClient) => new PrismaCatalogRepository(client)
        },
        {
          provide: CatalogService,
          inject: [CATALOG_REPOSITORY],
          useFactory: (repository: CatalogRepository) =>
            new CatalogService(repository, { generate: randomUUID }, { now: () => new Date() })
        },
        MvpSecurityService,
        DatabaseLifecycle
      ]
    };
  }
}
