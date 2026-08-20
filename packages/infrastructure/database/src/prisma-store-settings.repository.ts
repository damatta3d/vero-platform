import { Prisma, type PrismaClient } from '@prisma/client';

type DatabaseClient = InstanceType<typeof PrismaClient>;
type QueryClient = DatabaseClient | Prisma.TransactionClient;

export const storeWeekdays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
] as const;

export type StoreWeekday = (typeof storeWeekdays)[number];

export interface StoreSettingsInput {
  readonly identity: {
    readonly displayName: string;
    readonly phone: string | null;
    readonly whatsapp: string | null;
    readonly address: string | null;
    readonly addressComplement: string | null;
    readonly neighborhood: string | null;
    readonly city: string | null;
    readonly stateCode: string | null;
    readonly postalCode: string | null;
  };
  readonly operation: {
    readonly operationallyOpen: boolean;
    readonly pickupEnabled: boolean;
    readonly deliveryEnabled: boolean;
    readonly preparationTimeMinMinutes: number;
    readonly preparationTimeMaxMinutes: number;
    readonly minimumOrderCents: number;
    readonly orderReceiptMode: 'MANUAL' | 'AUTOMATIC';
    readonly timezone: string;
  };
  readonly delivery: {
    readonly maxRadiusKm: number | null;
    readonly baseFeeCents: number;
    readonly freeAboveCents: number | null;
  };
  readonly schedule: ReadonlyArray<{
    readonly weekday: StoreWeekday;
    readonly enabled: boolean;
    readonly opensAt: string | null;
    readonly closesAt: string | null;
  }>;
  readonly payments: {
    readonly pixEnabled: boolean;
    readonly paymentOnDeliveryEnabled: boolean;
    readonly cashEnabled: boolean;
    readonly cardOnDeliveryEnabled: boolean;
  };
}

export interface StoreSettings extends StoreSettingsInput {
  readonly updatedAt: Date;
}

interface SettingsRow {
  readonly displayName: string;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly address: string | null;
  readonly addressComplement: string | null;
  readonly neighborhood: string | null;
  readonly city: string | null;
  readonly stateCode: string | null;
  readonly postalCode: string | null;
  readonly operationallyOpen: boolean;
  readonly pickupEnabled: boolean;
  readonly deliveryEnabled: boolean;
  readonly preparationTimeMinMinutes: number;
  readonly preparationTimeMaxMinutes: number;
  readonly minimumOrderCents: number;
  readonly orderReceiptMode: 'MANUAL' | 'AUTOMATIC';
  readonly timezone: string;
  readonly maxRadiusKm: number | null;
  readonly baseFeeCents: number;
  readonly freeAboveCents: number | null;
  readonly pixEnabled: boolean;
  readonly paymentOnDeliveryEnabled: boolean;
  readonly cashEnabled: boolean;
  readonly cardOnDeliveryEnabled: boolean;
  readonly updatedAt: Date;
}

interface ScheduleRow {
  readonly weekday: number;
  readonly enabled: boolean;
  readonly opensAt: string | null;
  readonly closesAt: string | null;
}

export class PrismaStoreSettingsRepository {
  constructor(private readonly client: DatabaseClient) {}

  getOrCreate(tenantId: string): Promise<StoreSettings> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "store_settings" (
          "tenant_id", "display_name", "operationally_open", "pickup_enabled",
          "delivery_enabled", "preparation_time_min_minutes",
          "preparation_time_max_minutes", "minimum_order_cents", "order_receipt_mode",
          "timezone", "delivery_base_fee_cents", "pix_enabled", "payment_on_delivery_enabled",
          "cash_on_delivery_enabled", "card_on_delivery_enabled"
        ) VALUES (
          ${tenantId}, ${tenantId}, false, true, false, 30, 60, 0, 'MANUAL',
          'America/Campo_Grande', 0, true, false, false, false
        )
        ON CONFLICT ("tenant_id") DO NOTHING
      `);

      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "store_schedule_windows" ("tenant_id", "weekday", "sequence")
        SELECT ${tenantId}, "weekday", 0
        FROM generate_series(0, ${storeWeekdays.length - 1}) AS "weekdays"("weekday")
        ON CONFLICT ("tenant_id", "weekday", "sequence") DO NOTHING
      `);

      return this.read(transaction, tenantId);
    });
  }

  update(tenantId: string, input: StoreSettingsInput): Promise<StoreSettings> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "store_settings" (
          "tenant_id", "display_name", "phone", "whatsapp", "address",
          "address_complement", "neighborhood", "city", "state_code", "postal_code",
          "operationally_open", "pickup_enabled", "delivery_enabled",
          "preparation_time_min_minutes", "preparation_time_max_minutes",
          "minimum_order_cents", "order_receipt_mode", "timezone", "delivery_radius_km", "delivery_base_fee_cents",
          "free_delivery_above_cents", "pix_enabled", "payment_on_delivery_enabled",
          "cash_on_delivery_enabled", "card_on_delivery_enabled", "updated_at"
        ) VALUES (
          ${tenantId}, ${input.identity.displayName}, ${input.identity.phone},
          ${input.identity.whatsapp}, ${input.identity.address},
          ${input.identity.addressComplement}, ${input.identity.neighborhood},
          ${input.identity.city}, ${input.identity.stateCode}, ${input.identity.postalCode},
          ${input.operation.operationallyOpen}, ${input.operation.pickupEnabled},
          ${input.operation.deliveryEnabled}, ${input.operation.preparationTimeMinMinutes},
          ${input.operation.preparationTimeMaxMinutes}, ${input.operation.minimumOrderCents},
          ${input.operation.orderReceiptMode}, ${input.operation.timezone},
          ${input.delivery.maxRadiusKm}, ${input.delivery.baseFeeCents},
          ${input.delivery.freeAboveCents}, ${input.payments.pixEnabled},
          ${input.payments.paymentOnDeliveryEnabled}, ${input.payments.cashEnabled},
          ${input.payments.cardOnDeliveryEnabled}, NOW()
        )
        ON CONFLICT ("tenant_id") DO UPDATE SET
          "display_name" = EXCLUDED."display_name",
          "phone" = EXCLUDED."phone",
          "whatsapp" = EXCLUDED."whatsapp",
          "address" = EXCLUDED."address",
          "address_complement" = EXCLUDED."address_complement",
          "neighborhood" = EXCLUDED."neighborhood",
          "city" = EXCLUDED."city",
          "state_code" = EXCLUDED."state_code",
          "postal_code" = EXCLUDED."postal_code",
          "operationally_open" = EXCLUDED."operationally_open",
          "pickup_enabled" = EXCLUDED."pickup_enabled",
          "delivery_enabled" = EXCLUDED."delivery_enabled",
          "preparation_time_min_minutes" = EXCLUDED."preparation_time_min_minutes",
          "preparation_time_max_minutes" = EXCLUDED."preparation_time_max_minutes",
          "minimum_order_cents" = EXCLUDED."minimum_order_cents",
          "order_receipt_mode" = EXCLUDED."order_receipt_mode",
          "timezone" = EXCLUDED."timezone",
          "delivery_radius_km" = EXCLUDED."delivery_radius_km",
          "delivery_base_fee_cents" = EXCLUDED."delivery_base_fee_cents",
          "free_delivery_above_cents" = EXCLUDED."free_delivery_above_cents",
          "pix_enabled" = EXCLUDED."pix_enabled",
          "payment_on_delivery_enabled" = EXCLUDED."payment_on_delivery_enabled",
          "cash_on_delivery_enabled" = EXCLUDED."cash_on_delivery_enabled",
          "card_on_delivery_enabled" = EXCLUDED."card_on_delivery_enabled",
          "updated_at" = EXCLUDED."updated_at"
      `);

      for (const window of input.schedule) {
        const weekday = storeWeekdays.indexOf(window.weekday);
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "store_schedule_windows" (
            "tenant_id", "weekday", "sequence", "enabled", "opens_at", "closes_at"
          ) VALUES (
            ${tenantId}, ${weekday}, 0, ${window.enabled},
            ${window.opensAt}::time, ${window.closesAt}::time
          )
          ON CONFLICT ("tenant_id", "weekday", "sequence") DO UPDATE SET
            "enabled" = EXCLUDED."enabled",
            "opens_at" = EXCLUDED."opens_at",
            "closes_at" = EXCLUDED."closes_at"
        `);
      }

      return this.read(transaction, tenantId);
    });
  }

  private async read(client: QueryClient, tenantId: string): Promise<StoreSettings> {
    const settings = await client.$queryRaw<SettingsRow[]>(Prisma.sql`
      SELECT
        "display_name" AS "displayName",
        "phone",
        "whatsapp",
        "address",
        "address_complement" AS "addressComplement",
        "neighborhood",
        "city",
        "state_code" AS "stateCode",
        "postal_code" AS "postalCode",
        "operationally_open" AS "operationallyOpen",
        "pickup_enabled" AS "pickupEnabled",
        "delivery_enabled" AS "deliveryEnabled",
        "preparation_time_min_minutes" AS "preparationTimeMinMinutes",
        "preparation_time_max_minutes" AS "preparationTimeMaxMinutes",
        "minimum_order_cents" AS "minimumOrderCents",
        "order_receipt_mode" AS "orderReceiptMode",
        "timezone",
        "delivery_radius_km" AS "maxRadiusKm",
        "delivery_base_fee_cents" AS "baseFeeCents",
        "free_delivery_above_cents" AS "freeAboveCents",
        "pix_enabled" AS "pixEnabled",
        "payment_on_delivery_enabled" AS "paymentOnDeliveryEnabled",
        "cash_on_delivery_enabled" AS "cashEnabled",
        "card_on_delivery_enabled" AS "cardOnDeliveryEnabled",
        "updated_at" AS "updatedAt"
      FROM "store_settings"
      WHERE "tenant_id" = ${tenantId}
    `);
    const schedule = await client.$queryRaw<ScheduleRow[]>(Prisma.sql`
      SELECT
        "weekday",
        "enabled",
        CASE WHEN "opens_at" IS NULL THEN NULL ELSE to_char("opens_at", 'HH24:MI') END AS "opensAt",
        CASE WHEN "closes_at" IS NULL THEN NULL ELSE to_char("closes_at", 'HH24:MI') END AS "closesAt"
      FROM "store_schedule_windows"
      WHERE "tenant_id" = ${tenantId} AND "sequence" = 0
      ORDER BY "weekday"
    `);
    const row = settings[0];
    if (row === undefined) throw new Error('Store settings were not initialized');

    return {
      identity: {
        displayName: row.displayName,
        phone: row.phone,
        whatsapp: row.whatsapp,
        address: row.address,
        addressComplement: row.addressComplement,
        neighborhood: row.neighborhood,
        city: row.city,
        stateCode: row.stateCode,
        postalCode: row.postalCode
      },
      operation: {
        operationallyOpen: row.operationallyOpen,
        pickupEnabled: row.pickupEnabled,
        deliveryEnabled: row.deliveryEnabled,
        preparationTimeMinMinutes: row.preparationTimeMinMinutes,
        preparationTimeMaxMinutes: row.preparationTimeMaxMinutes,
        minimumOrderCents: row.minimumOrderCents,
        orderReceiptMode: row.orderReceiptMode,
        timezone: row.timezone
      },
      delivery: {
        maxRadiusKm: row.maxRadiusKm,
        baseFeeCents: row.baseFeeCents,
        freeAboveCents: row.freeAboveCents
      },
      schedule: storeWeekdays.map((weekday, index) => {
        const window = schedule.find((candidate) => candidate.weekday === index);
        return {
          weekday,
          enabled: window?.enabled ?? false,
          opensAt: window?.opensAt ?? null,
          closesAt: window?.closesAt ?? null
        };
      }),
      payments: {
        pixEnabled: row.pixEnabled,
        paymentOnDeliveryEnabled: row.paymentOnDeliveryEnabled,
        cashEnabled: row.cashEnabled,
        cardOnDeliveryEnabled: row.cardOnDeliveryEnabled
      },
      updatedAt: row.updatedAt
    };
  }
}
