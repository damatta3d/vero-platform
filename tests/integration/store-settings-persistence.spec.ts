import {
  createDatabaseClient,
  PrismaStoreSettingsRepository,
  storeWeekdays,
  type StoreSettingsInput
} from '@vero/infrastructure-database';

describe('store settings persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL'));
  const tenantA = 'settings-tenant-a-integration';
  const tenantB = 'settings-tenant-b-integration';
  const tenantC = 'settings-tenant-c-integration';

  beforeEach(async () => {
    await client.$executeRawUnsafe(
      'DELETE FROM "store_settings" WHERE "tenant_id" IN ($1, $2, $3)',
      tenantA,
      tenantB,
      tenantC
    );
  });

  afterAll(async () => {
    await client.$executeRawUnsafe(
      'DELETE FROM "store_settings" WHERE "tenant_id" IN ($1, $2, $3)',
      tenantA,
      tenantB,
      tenantC
    );
    await client.$disconnect();
  });

  it('creates conservative defaults once per tenant', async () => {
    const repository = new PrismaStoreSettingsRepository(client);
    const first = await repository.getOrCreate(tenantA);
    const second = await repository.getOrCreate(tenantA);
    const counts = await client.$queryRawUnsafe<Array<{ settings: bigint; schedule: bigint }>>(
      `SELECT
         (SELECT COUNT(*) FROM "store_settings" WHERE "tenant_id" = $1) AS settings,
         (SELECT COUNT(*) FROM "store_schedule_windows" WHERE "tenant_id" = $1) AS schedule`,
      tenantA
    );

    expect(first.operation).toEqual(
      expect.objectContaining({
        operationallyOpen: false,
        pickupEnabled: true,
        deliveryEnabled: false,
        minimumOrderCents: 0,
        orderReceiptMode: 'MANUAL'
      })
    );
    expect(first.schedule).toHaveLength(7);
    expect(second).toEqual(first);
    expect(counts[0]).toEqual({ settings: 1n, schedule: 7n });
  });

  it('preserves existing settings and schedule while filling missing weekdays', async () => {
    await client.$executeRawUnsafe(
      `INSERT INTO "store_settings" ("tenant_id", "display_name", "order_receipt_mode")
       VALUES ($1, $2, 'AUTOMATIC')`,
      tenantA,
      'Loja existente'
    );
    await client.$executeRawUnsafe(
      `INSERT INTO "store_schedule_windows" (
         "tenant_id", "weekday", "sequence", "enabled", "opens_at", "closes_at"
       ) VALUES ($1, 0, 0, true, '11:00', '22:00')`,
      tenantA
    );

    const settings = await new PrismaStoreSettingsRepository(client).getOrCreate(tenantA);
    const counts = await client.$queryRawUnsafe<Array<{ settings: bigint; schedule: bigint }>>(
      `SELECT
         (SELECT COUNT(*) FROM "store_settings" WHERE "tenant_id" = $1) AS settings,
         (SELECT COUNT(*) FROM "store_schedule_windows" WHERE "tenant_id" = $1) AS schedule`,
      tenantA
    );

    expect(settings.identity.displayName).toBe('Loja existente');
    expect(settings.operation.orderReceiptMode).toBe('AUTOMATIC');
    expect(settings.schedule).toHaveLength(7);
    expect(settings.schedule[0]).toEqual(
      expect.objectContaining({ enabled: true, opensAt: '11:00', closesAt: '22:00' })
    );
    expect(counts[0]).toEqual({ settings: 1n, schedule: 7n });
  });

  it('initializes one settings row and one window per weekday under concurrency', async () => {
    const repository = new PrismaStoreSettingsRepository(client);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => repository.getOrCreate(tenantC))
    );
    const counts = await client.$queryRawUnsafe<Array<{ settings: bigint; schedule: bigint }>>(
      `SELECT
         (SELECT COUNT(*) FROM "store_settings" WHERE "tenant_id" = $1) AS settings,
         (SELECT COUNT(*) FROM "store_schedule_windows" WHERE "tenant_id" = $1) AS schedule`,
      tenantC
    );

    expect(results).toHaveLength(8);
    expect(results.every((settings) => settings.operation.orderReceiptMode === 'MANUAL')).toBe(
      true
    );
    expect(counts[0]).toEqual({ settings: 1n, schedule: 7n });
  });

  it('persists receipt mode changes and isolates tenant A from tenant B', async () => {
    const repository = new PrismaStoreSettingsRepository(client);
    const automatic: StoreSettingsInput = {
      identity: {
        displayName: 'Loja A',
        phone: '(63) 3333-4444',
        whatsapp: '(63) 99999-0000',
        address: 'Rua A, 10',
        addressComplement: 'Sala 2',
        neighborhood: 'Centro',
        city: 'Araguaina',
        stateCode: 'TO',
        postalCode: '77800-000'
      },
      operation: {
        operationallyOpen: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        preparationTimeMinMinutes: 25,
        preparationTimeMaxMinutes: 45,
        minimumOrderCents: 3500,
        orderReceiptMode: 'AUTOMATIC',
        timezone: 'America/Campo_Grande'
      },
      delivery: { maxRadiusKm: 9.5, baseFeeCents: 800, freeAboveCents: 12_000 },
      schedule: storeWeekdays.map((weekday, index) => ({
        weekday,
        enabled: index < 6,
        opensAt: index < 6 ? '11:00' : null,
        closesAt: index < 6 ? '22:30' : null
      })),
      payments: {
        pixEnabled: true,
        paymentOnDeliveryEnabled: true,
        cashEnabled: true,
        cardOnDeliveryEnabled: true
      }
    };

    await repository.update(tenantA, automatic);
    const persistedAutomatic = await new PrismaStoreSettingsRepository(client).getOrCreate(tenantA);
    const manual: StoreSettingsInput = {
      ...automatic,
      operation: { ...automatic.operation, orderReceiptMode: 'MANUAL' }
    };
    await repository.update(tenantA, manual);
    const persistedManual = await repository.getOrCreate(tenantA);
    const otherTenant = await repository.getOrCreate(tenantB);

    expect(persistedAutomatic).toEqual(expect.objectContaining(automatic));
    expect(persistedAutomatic.schedule[0]).toEqual(
      expect.objectContaining({ weekday: 'MONDAY', opensAt: '11:00', closesAt: '22:30' })
    );
    expect(persistedManual.operation.orderReceiptMode).toBe('MANUAL');
    expect(otherTenant.identity.displayName).toBe(tenantB);
    expect(otherTenant.operation.operationallyOpen).toBe(false);
    expect(otherTenant.operation.minimumOrderCents).toBe(0);
    expect(otherTenant.operation.orderReceiptMode).toBe('MANUAL');
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
