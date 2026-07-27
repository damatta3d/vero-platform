import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'packages/infrastructure/database/prisma/schema.prisma',
  datasource: {
    url: env('VERO_DATABASE_URL')
  }
});
