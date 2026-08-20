import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { parseConfiguration } from '@vero/core-configuration';
import type {
  PrismaStoreSettingsRepository,
  StoreSettingsInput
} from '@vero/infrastructure-database';
import { CatalogModule } from '../catalog/catalog.module.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { StoreSettingsController } from './store-settings.controller.js';
import { StoreSettingsService } from './store-settings.service.js';
import { STORE_SETTINGS_REPOSITORY } from './store-settings.tokens.js';

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
      orderReceiptMode: 'MANUAL',
      timezone: 'America/Campo_Grande'
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
    ],
    [
      'invalid timezone',
      (value: MutableStoreSettings) => {
        value.operation.timezone = 'Campo Grande';
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

describe(`${StoreSettingsController.name} Nest bootstrap`, () => {
  const repository = { getOrCreate: jest.fn(), update: jest.fn() };
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CatalogModule.register(
          parseConfiguration({
            VERO_ENVIRONMENT: 'test',
            VERO_POSTGRES_ENABLED: 'true',
            VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero',
            VERO_MVP_ENABLED: 'true',
            VERO_MVP_API_KEY: apiKey,
            VERO_MVP_TENANT_ID: 'santo-parma'
          })
        )
      ]
    })
      .overrideProvider(STORE_SETTINGS_REPOSITORY)
      .useValue(repository)
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('injects both controller dependencies through the real module', () => {
    const controller: {
      security?: MvpSecurityService;
      settings?: StoreSettingsService;
    } = app.get(StoreSettingsController);

    expect(controller.settings).toBeInstanceOf(StoreSettingsService);
    expect(controller.security).toBeInstanceOf(MvpSecurityService);
  });

  it('executes GET through security, service and repository', async () => {
    const stored = { ...validInput(), updatedAt: new Date('2026-08-19T18:00:00.000Z') };
    repository.getOrCreate.mockResolvedValue(stored);

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/v1/settings/store',
        headers: { authorization: `Bearer ${apiKey}`, 'x-tenant-id': 'santo-parma' }
      });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ...stored, updatedAt: stored.updatedAt.toISOString() });
    expect(repository.getOrCreate).toHaveBeenCalledWith('santo-parma');
  });

  it('executes PUT through security, service and repository', async () => {
    const input = validInput();
    input.operation.orderReceiptMode = 'AUTOMATIC';
    const stored = { ...input, updatedAt: new Date('2026-08-19T18:00:00.000Z') };
    repository.update.mockResolvedValue(stored);

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'PUT',
        url: '/v1/settings/store',
        headers: { authorization: `Bearer ${apiKey}`, 'x-tenant-id': 'santo-parma' },
        payload: input
      });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ...stored, updatedAt: stored.updatedAt.toISOString() });
    expect(repository.update).toHaveBeenCalledWith('santo-parma', input);
  });
});
