import { RedisHealthClient } from '@vero/infrastructure-cache';
import { PostgresHealthClient } from '@vero/infrastructure-database';
import { RabbitMqHealthClient } from '@vero/infrastructure-messaging';

describe('foundation dependencies', () => {
  it('connects to PostgreSQL', async () => {
    await expect(new PostgresHealthClient(required('VERO_DATABASE_URL')).check()).resolves.toEqual({
      postgres: { status: 'up' }
    });
  });

  it('connects to Redis', async () => {
    await expect(new RedisHealthClient(required('VERO_REDIS_URL')).check()).resolves.toEqual({
      redis: { status: 'up' }
    });
  });

  it('connects to RabbitMQ without declaring topology', async () => {
    await expect(new RabbitMqHealthClient(required('VERO_RABBITMQ_URL')).check()).resolves.toEqual({
      rabbitmq: { status: 'up' }
    });
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
