import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { CheckoutAddress } from './checkout.types.js';

type DeliveryDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

type DeliverySettingsRow = {
  deliveryEnabled: boolean;
  maxRadiusKm: number | null;
  baseFeeCents: number;
  freeAboveCents: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  stateCode: string | null;
  postalCode: string | null;
};

type DeliveryFeeBandRow = {
  sequence: number;
  maxDistanceM: number;
  feeCents: number;
};

export type DeliveryRoute = {
  distanceMeters: number;
  provider: string;
};

export type DeliveryRouteProvider = {
  route(input: { origin: string; destination: string }): Promise<DeliveryRoute>;
};

export type DeliveryQuote = {
  distanceMeters: number;
  feeCents: number;
  provider: string;
  feeRule: string;
};

const maximumMoneyCents = 100_000_000;

function normalizeText(value: string | undefined | null): string {
  return value?.trim() || '';
}

export function formatDeliveryDestination(
  address: CheckoutAddress,
  locality: { city: string | null; stateCode: string | null }
): string {
  const parts = [
    `${normalizeText(address.street)}, ${normalizeText(address.number)}`,
    normalizeText(address.district),
    normalizeText(locality.city),
    normalizeText(locality.stateCode),
    normalizeText(address.postalCode),
    'Brasil'
  ].filter(Boolean);
  return parts.join(', ');
}

export function selectDeliveryFee(input: {
  distanceMeters: number;
  itemsTotalCents: number;
  baseFeeCents: number;
  freeAboveCents: number | null;
  bands: ReadonlyArray<DeliveryFeeBandRow>;
}): { feeCents: number; feeRule: string } {
  if (!Number.isSafeInteger(input.distanceMeters) || input.distanceMeters < 0) {
    throw new BadRequestException('Não foi possível calcular a distância da entrega.');
  }
  if (
    input.freeAboveCents !== null &&
    input.freeAboveCents >= 0 &&
    input.itemsTotalCents >= input.freeAboveCents
  ) {
    return { feeCents: 0, feeRule: `FREE_ABOVE:${input.freeAboveCents}` };
  }
  const selected = [...input.bands]
    .sort((a, b) => a.maxDistanceM - b.maxDistanceM)
    .find((band) => input.distanceMeters <= band.maxDistanceM);
  if (selected) {
    return { feeCents: selected.feeCents, feeRule: `BAND:${selected.sequence}` };
  }
  return { feeCents: input.baseFeeCents, feeRule: 'BASE_FEE' };
}

export async function quoteDelivery(
  database: DeliveryDatabase,
  routeProvider: DeliveryRouteProvider,
  input: {
    tenantId: string;
    address: CheckoutAddress;
    itemsTotalCents: number;
  }
): Promise<DeliveryQuote> {
  const settings = await database.$queryRawUnsafe<DeliverySettingsRow[]>(
    `SELECT delivery_enabled AS "deliveryEnabled",
            delivery_radius_km AS "maxRadiusKm",
            delivery_base_fee_cents AS "baseFeeCents",
            free_delivery_above_cents AS "freeAboveCents",
            address, neighborhood, city, state_code AS "stateCode", postal_code AS "postalCode"
       FROM store_settings
      WHERE tenant_id=$1`,
    input.tenantId
  );
  const setting = settings[0];
  if (!setting?.deliveryEnabled) {
    throw new BadRequestException('A entrega não está disponível para este pedido.');
  }
  if (!setting.address || !setting.city || !setting.stateCode) {
    throw new ServiceUnavailableException(
      'O endereço de origem da loja ainda não está configurado.'
    );
  }
  if (
    !Number.isSafeInteger(setting.baseFeeCents) ||
    setting.baseFeeCents < 0 ||
    setting.baseFeeCents > maximumMoneyCents ||
    (setting.freeAboveCents !== null &&
      (!Number.isSafeInteger(setting.freeAboveCents) ||
        setting.freeAboveCents < 0 ||
        setting.freeAboveCents > maximumMoneyCents))
  ) {
    throw new ServiceUnavailableException('A configuração de entrega da loja não é válida.');
  }

  const origin = [
    setting.address,
    setting.neighborhood,
    setting.city,
    setting.stateCode,
    setting.postalCode,
    'Brasil'
  ]
    .filter(Boolean)
    .join(', ');
  const destination = formatDeliveryDestination(input.address, setting);
  const route = await routeProvider.route({ origin, destination });
  if (!Number.isSafeInteger(route.distanceMeters) || route.distanceMeters < 0) {
    throw new ServiceUnavailableException('Não foi possível calcular a rota da entrega.');
  }

  if (
    setting.maxRadiusKm !== null &&
    Number.isFinite(setting.maxRadiusKm) &&
    route.distanceMeters > Math.round(setting.maxRadiusKm * 1000)
  ) {
    throw new BadRequestException({
      code: 'DELIVERY_OUT_OF_RANGE',
      message: 'Este endereço está fora da nossa área de entrega.'
    });
  }

  const bands = await database.$queryRawUnsafe<DeliveryFeeBandRow[]>(
    `SELECT sequence, max_distance_m AS "maxDistanceM", fee_cents AS "feeCents"
       FROM store_delivery_fee_bands
      WHERE tenant_id=$1
      ORDER BY max_distance_m`,
    input.tenantId
  );
  if (
    bands.some(
      (band) =>
        !Number.isInteger(band.sequence) ||
        !Number.isSafeInteger(band.maxDistanceM) ||
        band.maxDistanceM <= 0 ||
        !Number.isSafeInteger(band.feeCents) ||
        band.feeCents < 0 ||
        band.feeCents > maximumMoneyCents
    )
  ) {
    throw new ServiceUnavailableException('A tabela de frete da loja não é válida.');
  }

  const fee = selectDeliveryFee({
    distanceMeters: route.distanceMeters,
    itemsTotalCents: input.itemsTotalCents,
    baseFeeCents: setting.baseFeeCents,
    freeAboveCents: setting.freeAboveCents,
    bands
  });
  return {
    distanceMeters: route.distanceMeters,
    feeCents: fee.feeCents,
    provider: route.provider,
    feeRule: fee.feeRule
  };
}
