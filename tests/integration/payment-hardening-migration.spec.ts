import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

const migrationsRoot = resolve('packages/infrastructure/database/prisma/migrations');
const paymentMigration = '20260821160000_payment_hardening';

describe('payment hardening migration', () => {
  jest.setTimeout(90_000);

  it.each(['empty', 'incremental'] as const)('applies safely to an %s database', async (mode) => {
    const sourceUrl = new URL(required('VERO_DATABASE_URL'));
    const databaseName = `vero_payment_${mode}_${randomUUID().replaceAll('-', '')}`;
    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = '/postgres';
    const targetUrl = new URL(sourceUrl);
    targetUrl.pathname = `/${databaseName}`;
    const admin = new Client({ connectionString: adminUrl.toString() });
    let target: Client | undefined;

    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE "${databaseName}"`);
      target = new Client({ connectionString: targetUrl.toString() });
      await target.connect();

      const migrations = (await readdir(migrationsRoot)).sort();
      if (mode === 'empty') {
        for (const migration of migrations) await target.query(await migrationSql(migration));
      } else {
        for (const migration of migrations.filter((name) => name < paymentMigration)) {
          await target.query(await migrationSql(migration));
        }
        const legacyOrderId = randomUUID();
        await target.query(
          `INSERT INTO commerce_native_orders
               (id,tenant_id,menu_slug,customer_name,customer_phone,fulfillment,
                items_total_cents,total_cents,payment_method,payment_status,status,
                created_at,updated_at)
             VALUES ($1::uuid,'legacy-tenant','legacy-menu','Cliente legado','67990000000',
                     'PICKUP',4590,4590,'PAY_ON_DELIVERY','PENDING','RECEIVED',NOW(),NOW())`,
          [legacyOrderId]
        );
        await target.query(await migrationSql(paymentMigration));
        const legacy = await target.query<{ payment_id: string | null }>(
          'SELECT payment_id FROM commerce_native_orders WHERE id=$1::uuid',
          [legacyOrderId]
        );
        expect(legacy.rows).toEqual([{ payment_id: null }]);
      }

      const tables = await target.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
            WHERE table_schema='public' AND table_name IN
              ('commerce_payment_attempts','commerce_payment_status_history',
               'commerce_payment_webhook_inbox')
            ORDER BY table_name`
      );
      expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
        'commerce_payment_attempts',
        'commerce_payment_status_history',
        'commerce_payment_webhook_inbox'
      ]);
      const paymentColumn = await target.query<{ is_nullable: string }>(
        `SELECT is_nullable FROM information_schema.columns
            WHERE table_schema='public' AND table_name='commerce_native_orders'
              AND column_name='payment_id'`
      );
      expect(paymentColumn.rows).toEqual([{ is_nullable: 'YES' }]);
    } finally {
      if (target) await target.end();
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });
});

function migrationSql(migration: string): Promise<string> {
  return readFile(resolve(migrationsRoot, migration, 'migration.sql'), 'utf8');
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
