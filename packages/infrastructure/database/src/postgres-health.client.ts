import { Pool } from 'pg';

export class PostgresHealthClient {
  constructor(private readonly url: string) {}

  async check(): Promise<{ postgres: { status: 'up' } }> {
    const pool = new Pool({
      connectionString: this.url,
      max: 1,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 1_000
    });
    try {
      await pool.query('SELECT 1');
      return { postgres: { status: 'up' } };
    } finally {
      await pool.end();
    }
  }
}
