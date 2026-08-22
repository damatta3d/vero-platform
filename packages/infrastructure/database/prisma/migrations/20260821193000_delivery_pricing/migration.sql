-- Delivery pricing foundation.
-- Keeps the existing flat-fee columns for backwards compatibility and adds
-- ordered distance bands plus auditable delivery snapshots on native orders.

CREATE TABLE IF NOT EXISTS store_delivery_fee_bands (
  tenant_id VARCHAR(128) NOT NULL,
  sequence SMALLINT NOT NULL,
  max_distance_m INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT store_delivery_fee_bands_pkey PRIMARY KEY (tenant_id, sequence),
  CONSTRAINT store_delivery_fee_bands_distance_check CHECK (max_distance_m > 0),
  CONSTRAINT store_delivery_fee_bands_fee_check CHECK (fee_cents >= 0),
  CONSTRAINT store_delivery_fee_bands_sequence_check CHECK (sequence >= 0),
  CONSTRAINT store_delivery_fee_bands_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES store_settings(tenant_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS store_delivery_fee_bands_tenant_distance_key
  ON store_delivery_fee_bands (tenant_id, max_distance_m);

CREATE INDEX IF NOT EXISTS store_delivery_fee_bands_lookup_idx
  ON store_delivery_fee_bands (tenant_id, max_distance_m);

ALTER TABLE commerce_native_orders
  ADD COLUMN IF NOT EXISTS delivery_distance_m INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_quote_provider VARCHAR(64),
  ADD COLUMN IF NOT EXISTS delivery_fee_rule VARCHAR(160);

ALTER TABLE commerce_native_orders
  DROP CONSTRAINT IF EXISTS commerce_native_orders_delivery_distance_check;

ALTER TABLE commerce_native_orders
  ADD CONSTRAINT commerce_native_orders_delivery_distance_check
  CHECK (delivery_distance_m IS NULL OR delivery_distance_m >= 0);
