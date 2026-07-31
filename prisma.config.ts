import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { defineConfig, env } from 'prisma/config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default defineConfig({
  schema: 'packages/infrastructure/database/prisma/schema.prisma',
  migrations: {
    path: 'packages/infrastructure/database/prisma/migrations'
  },
  datasource: {
    url: env('VERO_DATABASE_URL')
  }
});
