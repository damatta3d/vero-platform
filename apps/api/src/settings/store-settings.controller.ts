import { BadRequestException, Body, Controller, Get, Headers, Inject, Put } from '@nestjs/common';
import { z } from 'zod';

import { storeWeekdays, type StoreSettingsInput } from '@vero/infrastructure-database';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { isValidStoreTimezone } from '../menu/store-availability.js';
import { StoreSettingsService } from './store-settings.service.js';

const nullableText = (maximum: number) => z.string().trim().min(1).max(maximum).nullable();
const phone = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^[+()\d\s.-]+$/)
  .nullable();
const time = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  .nullable();
const brazilianStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO'
] as const;

const scheduleDaySchema = z
  .object({
    weekday: z.enum(storeWeekdays),
    enabled: z.boolean(),
    opensAt: time,
    closesAt: time
  })
  .strict()
  .superRefine((day, context) => {
    if (day.enabled && (!day.opensAt || !day.closesAt)) {
      context.addIssue({
        code: 'custom',
        path: ['opensAt'],
        message: 'Enabled days require opening and closing times.'
      });
    }
    if (day.enabled && day.opensAt && day.closesAt && day.opensAt >= day.closesAt) {
      context.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'Closing time must be later than opening time.'
      });
    }
  });

const storeSettingsSchema = z
  .object({
    identity: z
      .object({
        displayName: z.string().trim().min(1).max(160),
        phone,
        whatsapp: phone,
        address: nullableText(240),
        addressComplement: nullableText(160),
        neighborhood: nullableText(120),
        city: nullableText(120),
        stateCode: z.enum(brazilianStates).nullable(),
        postalCode: z
          .string()
          .trim()
          .regex(/^\d{5}-?\d{3}$/)
          .nullable()
      })
      .strict(),
    operation: z
      .object({
        operationallyOpen: z.boolean(),
        pickupEnabled: z.boolean(),
        deliveryEnabled: z.boolean(),
        preparationTimeMinMinutes: z.number().int().min(1).max(1440),
        preparationTimeMaxMinutes: z.number().int().min(1).max(1440),
        minimumOrderCents: z.number().int().nonnegative().max(100_000_000),
        orderReceiptMode: z.enum(['MANUAL', 'AUTOMATIC']),
        timezone: z.string().trim().min(1).max(64).refine(isValidStoreTimezone)
      })
      .strict(),
    delivery: z
      .object({
        maxRadiusKm: z.number().finite().nonnegative().max(1000).nullable(),
        baseFeeCents: z.number().int().nonnegative().max(100_000_000),
        freeAboveCents: z.number().int().nonnegative().max(100_000_000).nullable()
      })
      .strict(),
    schedule: z.array(scheduleDaySchema).length(storeWeekdays.length),
    payments: z
      .object({
        pixEnabled: z.boolean(),
        paymentOnDeliveryEnabled: z.boolean(),
        cashEnabled: z.boolean(),
        cardOnDeliveryEnabled: z.boolean()
      })
      .strict()
  })
  .strict()
  .superRefine((settings, context) => {
    if (
      settings.operation.preparationTimeMinMinutes > settings.operation.preparationTimeMaxMinutes
    ) {
      context.addIssue({
        code: 'custom',
        path: ['operation', 'preparationTimeMaxMinutes'],
        message: 'Maximum preparation time must not be lower than minimum preparation time.'
      });
    }
    if (
      settings.operation.operationallyOpen &&
      !settings.operation.pickupEnabled &&
      !settings.operation.deliveryEnabled
    ) {
      context.addIssue({
        code: 'custom',
        path: ['operation', 'pickupEnabled'],
        message: 'An open store must offer pickup or delivery.'
      });
    }
    const weekdays = new Set(settings.schedule.map((day) => day.weekday));
    if (weekdays.size !== storeWeekdays.length) {
      context.addIssue({
        code: 'custom',
        path: ['schedule'],
        message: 'Schedule must contain each weekday exactly once.'
      });
    }
  });

function parse(body: unknown): StoreSettingsInput {
  const parsed = storeSettingsSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_STORE_SETTINGS',
      fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))]
    });
  }
  return parsed.data;
}

@Controller('v1/settings/store')
export class StoreSettingsController {
  constructor(
    @Inject(StoreSettingsService) private readonly settings: StoreSettingsService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.settings.get(
      await this.security.authorize(authorization, tenantId, 'settings.store.read')
    );
  }

  @Put()
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const access = await this.security.authorize(authorization, tenantId, 'settings.store.write');
    const input = parse(body);
    return this.settings.update(access, input);
  }
}
