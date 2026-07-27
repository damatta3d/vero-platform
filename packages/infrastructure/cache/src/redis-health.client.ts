import Redis from 'ioredis';

export class RedisHealthClient {
  constructor(private readonly url: string) {}

  async check(): Promise<{ redis: { status: 'up' } }> {
    const client = new Redis(this.url, {
      lazyConnect: true,
      connectTimeout: 3_000,
      commandTimeout: 3_000,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false
    });
    try {
      await client.connect();
      const response = await client.ping();
      if (response !== 'PONG') throw new Error('Redis health response was invalid');
      return { redis: { status: 'up' } };
    } finally {
      client.disconnect(false);
    }
  }
}
