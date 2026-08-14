CREATE TABLE "store_settings" (
  "tenant_id" VARCHAR(128) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(32),
  "whatsapp" VARCHAR(32),
  "address" VARCHAR(240),
  "address_complement" VARCHAR(160),
  "neighborhood" VARCHAR(120),
  "city" VARCHAR(120),
  "state_code" CHAR(2),
  "postal_code" VARCHAR(9),
  "operationally_open" BOOLEAN NOT NULL DEFAULT false,
  "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
  "delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  "preparation_time_min_minutes" INTEGER NOT NULL DEFAULT 30,
  "preparation_time_max_minutes" INTEGER NOT NULL DEFAULT 60,
  "minimum_order_cents" INTEGER NOT NULL DEFAULT 0,
  "delivery_radius_km" DOUBLE PRECISION,
  "delivery_base_fee_cents" INTEGER NOT NULL DEFAULT 0,
  "free_delivery_above_cents" INTEGER,
  "pix_enabled" BOOLEAN NOT NULL DEFAULT true,
  "payment_on_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  "cash_on_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  "card_on_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_settings_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "store_settings_preparation_range_check" CHECK (
    "preparation_time_min_minutes" >= 1
    AND "preparation_time_max_minutes" >= "preparation_time_min_minutes"
    AND "preparation_time_max_minutes" <= 1440
  ),
  CONSTRAINT "store_settings_money_check" CHECK (
    "minimum_order_cents" >= 0
    AND "delivery_base_fee_cents" >= 0
    AND ("free_delivery_above_cents" IS NULL OR "free_delivery_above_cents" >= 0)
  ),
  CONSTRAINT "store_settings_delivery_radius_check" CHECK (
    "delivery_radius_km" IS NULL OR "delivery_radius_km" >= 0
  ),
  CONSTRAINT "store_settings_open_fulfillment_check" CHECK (
    NOT "operationally_open" OR "pickup_enabled" OR "delivery_enabled"
  )
);

CREATE TABLE "store_schedule_windows" (
  "tenant_id" VARCHAR(128) NOT NULL,
  "weekday" SMALLINT NOT NULL,
  "sequence" SMALLINT NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "opens_at" TIME(0),
  "closes_at" TIME(0),
  CONSTRAINT "store_schedule_windows_pkey" PRIMARY KEY ("tenant_id", "weekday", "sequence"),
  CONSTRAINT "store_schedule_windows_settings_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "store_settings"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_schedule_windows_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "store_schedule_windows_sequence_check" CHECK ("sequence" >= 0),
  CONSTRAINT "store_schedule_windows_times_check" CHECK (
    (NOT "enabled")
    OR (
      "opens_at" IS NOT NULL
      AND "closes_at" IS NOT NULL
      AND "opens_at" < "closes_at"
    )
  )
);

CREATE INDEX "store_schedule_windows_tenant_weekday_idx"
  ON "store_schedule_windows"("tenant_id", "weekday");
