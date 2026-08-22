-- Configurable delivery ranges and the persistent delivery operation workflow.
-- Ranges are [min_distance_m, max_distance_m), except the final configured
-- range whose upper bound is inclusive.

ALTER TABLE store_delivery_fee_bands
  ADD COLUMN IF NOT EXISTS min_distance_m INTEGER,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

WITH ordered AS (
  SELECT tenant_id, sequence,
         COALESCE(LAG(max_distance_m) OVER (PARTITION BY tenant_id ORDER BY max_distance_m), 0)
           AS calculated_min
    FROM store_delivery_fee_bands
)
UPDATE store_delivery_fee_bands AS bands
   SET min_distance_m=ordered.calculated_min
  FROM ordered
 WHERE bands.tenant_id=ordered.tenant_id
   AND bands.sequence=ordered.sequence
   AND bands.min_distance_m IS NULL;

ALTER TABLE store_delivery_fee_bands
  ALTER COLUMN min_distance_m SET NOT NULL,
  DROP CONSTRAINT IF EXISTS store_delivery_fee_bands_range_check;

ALTER TABLE store_delivery_fee_bands
  ADD CONSTRAINT store_delivery_fee_bands_range_check
  CHECK (min_distance_m >= 0 AND max_distance_m > min_distance_m);

ALTER TABLE commerce_native_orders
  ADD COLUMN IF NOT EXISTS delivery_normalized_address TEXT;

CREATE TABLE commerce_delivery_drivers (
  id UUID NOT NULL,
  tenant_id VARCHAR(128) NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(32),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT commerce_delivery_drivers_pkey PRIMARY KEY (id),
  CONSTRAINT commerce_delivery_drivers_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES store_settings(tenant_id) ON DELETE CASCADE,
  CONSTRAINT commerce_delivery_drivers_name_check CHECK (length(trim(name)) > 0)
);

CREATE INDEX commerce_delivery_drivers_tenant_active_idx
  ON commerce_delivery_drivers (tenant_id, active, name);

CREATE TABLE commerce_deliveries (
  id UUID NOT NULL,
  tenant_id VARCHAR(128) NOT NULL,
  order_id UUID NOT NULL,
  driver_id UUID,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  assigned_at TIMESTAMPTZ(3),
  out_for_delivery_at TIMESTAMPTZ(3),
  delivered_at TIMESTAMPTZ(3),
  cancelled_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT commerce_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT commerce_deliveries_order_key UNIQUE (order_id),
  CONSTRAINT commerce_deliveries_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES store_settings(tenant_id) ON DELETE CASCADE,
  CONSTRAINT commerce_deliveries_order_fk
    FOREIGN KEY (order_id) REFERENCES commerce_native_orders(id) ON DELETE CASCADE,
  CONSTRAINT commerce_deliveries_driver_fk
    FOREIGN KEY (driver_id) REFERENCES commerce_delivery_drivers(id) ON DELETE RESTRICT,
  CONSTRAINT commerce_deliveries_status_check
    CHECK (status IN ('WAITING','ASSIGNED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'))
);

CREATE INDEX commerce_deliveries_tenant_status_idx
  ON commerce_deliveries (tenant_id, status, created_at);
CREATE INDEX commerce_deliveries_driver_status_idx
  ON commerce_deliveries (driver_id, status) WHERE driver_id IS NOT NULL;

INSERT INTO commerce_deliveries (id,tenant_id,order_id,status,created_at,updated_at)
SELECT gen_random_uuid(),tenant_id,id,
       CASE status
         WHEN 'DISPATCHED' THEN 'OUT_FOR_DELIVERY'
         WHEN 'COMPLETED' THEN 'DELIVERED'
         WHEN 'CANCELLED' THEN 'CANCELLED'
         ELSE 'WAITING'
       END,
       created_at,updated_at
  FROM commerce_native_orders
 WHERE fulfillment='DELIVERY'
ON CONFLICT (order_id) DO NOTHING;
