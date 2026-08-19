import { parseConfiguration } from '@vero/core-configuration';
import type {
  PrismaStoreSettingsRepository,
  StoreSettingsInput
} from '@vero/infrastructure-database';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { StoreSettingsService } from './store-settings.service.js';

const apiKey = 'santo-parma-integration-key-123456';

function input(): StoreSettingsInput {
  return {
    identity: {
      displayName: 'O Santo Parma',
      phone: '(63) 3333-4444',
      whatsapp: '(63) 99999-0000',
      address: 'Rua das Flores, 123',
      addressComplement: null,
      neighborhood: 'Centro',
      city: 'Araguaina',
      stateCode: 'TO',
      postalCode: '77800-000'
    },
    operation: {
      operationallyOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      preparationTimeMinMinutes: 30,
      preparationTimeMaxMinutes: 50,
      minimumOrderCents: 2500,
      orderReceiptMode: 'MANUAL'
    },
    delivery: { maxRadiusKm: 8.5, baseFeeCents: 700, freeAboveCents: 10_000 },
    schedule: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(
      (weekday) => ({
        weekday: weekday as StoreSettingsInput['schedule'][number]['weekday'],
        enabled: weekday !== 'SUNDAY',
        opensAt: weekday !== 'SUNDAY' ? '11:00' : null,
        closesAt: weekday !== 'SUNDAY' ? '22:00' : null
      })
    ),
    payments: {
      pixEnabled: true,
      paymentOnDeliveryEnabled: true,
      cashEnabled: true,
      cardOnDeliveryEnabled: true
    }
  };
}

describe(StoreSettingsService.name, () => {
  const security = new MvpSecurityService(
    parseConfiguration({
      VERO_ENVIRONMENT: 'test',
      VERO_POSTGRES_ENABLED: 'true',
      VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero',
      VERO_MVP_ENABLED: 'true',
      VERO_MVP_API_KEY: apiKey,
      VERO_MVP_TENANT_ID: 'santo-parma'
    })
  );
  const repository = { getOrCreate: jest.fn(), update: jest.fn() };
  const service = new StoreSettingsService(repository as unknown as PrismaStoreSettingsRepository);

  beforeEach(() => jest.clearAllMocks());

  it('initializes and reads settings only for the authorized tenant', async () => {
    repository.getOrCreate.mockResolvedValue({ ...input(), updatedAt: new Date() });
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'settings.store.read'
    );

    await expect(service.get(access)).resolves.toEqual(
      expect.objectContaining({
        identity: expect.objectContaining({ displayName: 'O Santo Parma' })
      })
    );
    expect(repository.getOrCreate).toHaveBeenCalledWith('santo-parma');
  });

  it('persists an update only for the authorized tenant', async () => {
    const settings = input();
    repository.update.mockResolvedValue({ ...settings, updatedAt: new Date() });
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'settings.store.write'
    );

    await expect(service.update(access, settings)).resolves.toEqual(
      expect.objectContaining({ operation: settings.operation })
    );
    expect(repository.update).toHaveBeenCalledWith('santo-parma', settings);
  });

  it('rejects a read-only authorization context for updates', async () => {
    const access = await security.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'settings.store.read'
    );

    expect(() => service.update(access, input())).toThrow('Unauthorized store settings access');
    expect(repository.update).not.toHaveBeenCalled();
  });
});
