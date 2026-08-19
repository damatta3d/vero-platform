import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

import { createDatabaseClient, PrismaStoreSettingsRepository } from '@vero/infrastructure-database';

const migrationsRoot = resolve('packages/infrastructure/database/prisma/migrations');
const receiptMigration = '20260819173000_order_receipt_mode';
const repairMigration = '20260819193000_repair_order_receipt_mode';

describe('order receipt mode migration recovery', () => {
  jest.setTimeout(60_000);

  it('recovers a partially initialized schema without breaking store settings reads', async () => {
    const sourceUrl = new URL(required('VERO_DATABASE_URL'));
    const databaseName = `vero_receipt_repair_${randomUUID().replaceAll('-', '')}`;
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

      for (const migration of await migrationsBefore(receiptMigration)) {
        await target.query(await migrationSql(migration));
      }
      await target.query(
        'ALTER TABLE "store_settings" ADD COLUMN "order_receipt_mode" VARCHAR(16) NOT NULL'
      );
      await target.query(
        `INSERT INTO "store_settings" ("tenant_id", "display_name", "order_receipt_mode")
         VALUES ('existing-partial-tenant', 'Existing partial tenant', 'AUTOMATIC')`
      );
      await target.end();
      target = undefined;

      const database = createDatabaseClient(targetUrl.toString());
      const repository = new PrismaStoreSettingsRepository(database);
      await expect(repository.getOrCreate('existing-partial-tenant')).resolves.toEqual(
        expect.objectContaining({
          identity: expect.objectContaining({ displayName: 'Existing partial tenant' }),
          operation: expect.objectContaining({ orderReceiptMode: 'AUTOMATIC' })
        })
      );
      await expect(repository.getOrCreate('new-partial-tenant')).resolves.toEqual(
        expect.objectContaining({
          operation: expect.objectContaining({ orderReceiptMode: 'MANUAL' })
        })
      );
      await database.$disconnect();

      target = new Client({ connectionString: targetUrl.toString() });
      await target.connect();
      await target.query(await migrationSql(receiptMigration));
      await target.query(await migrationSql(repairMigration));

      const columns = await target.query<{
        character_maximum_length: number | null;
        column_name: string;
        column_default: string | null;
        data_type: string;
        is_nullable: 'YES' | 'NO';
      }>(
        `SELECT column_name, column_default, data_type, character_maximum_length, is_nullable
         FROM information_schema.columns
         WHERE table_schema='public'
           AND table_name IN ('store_settings', 'commerce_native_orders')
           AND column_name IN ('order_receipt_mode', 'confirmed_source', 'confirmed_at')
         ORDER BY column_name`
      );
      const constraints = await target.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint
         WHERE conname IN (
           'store_settings_order_receipt_mode_check',
           'commerce_native_orders_confirmed_source_check'
         )
         ORDER BY conname`
      );

      expect(columns.rows).toEqual([
        expect.objectContaining({
          column_name: 'confirmed_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES'
        }),
        expect.objectContaining({
          column_name: 'confirmed_source',
          character_maximum_length: 16,
          data_type: 'character varying',
          is_nullable: 'YES'
        }),
        expect.objectContaining({
          character_maximum_length: 16,
          column_name: 'order_receipt_mode',
          column_default: "'MANUAL'::character varying",
          data_type: 'character varying',
          is_nullable: 'NO'
        })
      ]);
      expect(constraints.rows).toEqual([
        { conname: 'commerce_native_orders_confirmed_source_check' },
        { conname: 'store_settings_order_receipt_mode_check' }
      ]);
    } finally {
      if (target) await target.end();
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  });
});

async function migrationsBefore(limit: string): Promise<string[]> {
  return (await readdir(migrationsRoot)).filter((migration) => migration < limit).sort();
}

function migrationSql(migration: string): Promise<string> {
  return readFile(resolve(migrationsRoot, migration, 'migration.sql'), 'utf8');
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
