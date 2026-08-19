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

  afterAll(async () => {
    await client.$executeRawUnsafe(
      'DELETE FROM "store_settings" WHERE "tenant_id" IN ($1, $2)',
      tenantA,
      tenantB
    );
    await client.$disconnect();
  });

  it('creates conservative defaults once per tenant', async () => {
    const repository = new PrismaStoreSettingsRepository(client);
    const first = await repository.getOrCreate(tenantA);
    const second = await repository.getOrCreate(tenantA);
    const counts = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*) AS count FROM "store_settings" WHERE "tenant_id" = $1',
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
    expect(counts[0]?.count).toBe(1n);
  });

  it('persists updates and isolates tenant A from tenant B', async () => {
    const repository = new PrismaStoreSettingsRepository(client);
    const input: StoreSettingsInput = {
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
        orderReceiptMode: 'AUTOMATIC'
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

    await repository.update(tenantA, input);
    const persisted = await new PrismaStoreSettingsRepository(client).getOrCreate(tenantA);
    const otherTenant = await repository.getOrCreate(tenantB);

    expect(persisted).toEqual(expect.objectContaining(input));
    expect(persisted.schedule[0]).toEqual(
      expect.objectContaining({ weekday: 'MONDAY', opensAt: '11:00', closesAt: '22:30' })
    );
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
