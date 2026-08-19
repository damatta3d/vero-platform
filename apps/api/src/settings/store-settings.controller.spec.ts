import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { parseConfiguration } from '@vero/core-configuration';
import type {
  PrismaStoreSettingsRepository,
  StoreSettingsInput
} from '@vero/infrastructure-database';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { StoreSettingsController } from './store-settings.controller.js';
import { StoreSettingsService } from './store-settings.service.js';

const apiKey = 'santo-parma-integration-key-123456';

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends ReadonlyArray<infer Item>
    ? Array<Mutable<Item>>
    : T[Key] extends object
      ? Mutable<T[Key]>
      : T[Key];
};
type MutableStoreSettings = Mutable<StoreSettingsInput>;

function validInput(): MutableStoreSettings {
  const weekdays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ] as const;
  return {
    identity: {
      displayName: 'O Santo Parma',
      phone: null,
      whatsapp: null,
      address: null,
      addressComplement: null,
      neighborhood: null,
      city: 'Araguaina',
      stateCode: 'TO',
      postalCode: '77800-000'
    },
    operation: {
      operationallyOpen: false,
      pickupEnabled: true,
      deliveryEnabled: false,
      preparationTimeMinMinutes: 30,
      preparationTimeMaxMinutes: 60,
      minimumOrderCents: 0,
      orderReceiptMode: 'MANUAL'
    },
    delivery: { maxRadiusKm: null, baseFeeCents: 0, freeAboveCents: null },
    schedule: weekdays.map((weekday) => ({
      weekday,
      enabled: false,
      opensAt: null,
      closesAt: null
    })),
    payments: {
      pixEnabled: true,
      paymentOnDeliveryEnabled: false,
      cashEnabled: false,
      cardOnDeliveryEnabled: false
    }
  };
}

describe(StoreSettingsController.name, () => {
  const repository = { getOrCreate: jest.fn(), update: jest.fn() };
  const settings = new StoreSettingsService(repository as unknown as PrismaStoreSettingsRepository);
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
  const controller = new StoreSettingsController(settings, security);

  beforeEach(() => jest.clearAllMocks());

  it('returns the persistent API response shape', async () => {
    const stored = { ...validInput(), updatedAt: new Date('2026-08-14T18:00:00.000Z') };
    repository.getOrCreate.mockResolvedValue(stored);

    await expect(controller.get(`Bearer ${apiKey}`, 'santo-parma')).resolves.toEqual(stored);
  });

  it('rejects unauthenticated reads and a tenant outside the configured context', async () => {
    await expect(controller.get(undefined, 'santo-parma')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await expect(controller.get(`Bearer ${apiKey}`, 'another-tenant')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it.each([
    ['negative money', (value: MutableStoreSettings) => (value.operation.minimumOrderCents = -1)],
    [
      'inverted preparation range',
      (value: MutableStoreSettings) => {
        value.operation.preparationTimeMinMinutes = 90;
        value.operation.preparationTimeMaxMinutes = 30;
      }
    ],
    [
      'invalid active schedule',
      (value: MutableStoreSettings) => {
        value.schedule[0] = {
          weekday: 'MONDAY',
          enabled: true,
          opensAt: '22:00',
          closesAt: '11:00'
        };
      }
    ],
    [
      'open without fulfillment',
      (value: MutableStoreSettings) => {
        value.operation.operationallyOpen = true;
        value.operation.pickupEnabled = false;
        value.operation.deliveryEnabled = false;
      }
    ]
  ])('rejects %s', async (_label, mutate) => {
    const value = structuredClone(validInput());
    mutate(value);

    await expect(
      controller.update(`Bearer ${apiKey}`, 'santo-parma', value)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not accept tenantId from the request body', async () => {
    const value = { ...validInput(), tenantId: 'another-tenant' };

    await expect(
      controller.update(`Bearer ${apiKey}`, 'santo-parma', value)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('authenticates before disclosing request validation errors', async () => {
    await expect(controller.update(undefined, 'santo-parma', {})).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('validates and persists a complete update', async () => {
    const value = validInput();
    value.operation.orderReceiptMode = 'AUTOMATIC';
    const stored = { ...value, updatedAt: new Date('2026-08-14T18:00:00.000Z') };
    repository.update.mockResolvedValue(stored);

    await expect(controller.update(`Bearer ${apiKey}`, 'santo-parma', value)).resolves.toEqual(
      stored
    );
    expect(repository.update).toHaveBeenCalledWith('santo-parma', value);
  });
});
