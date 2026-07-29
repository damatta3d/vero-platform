import { createHash } from 'node:crypto';
import type {
  ExternalOrder,
  ExternalOrderDeliveryAddress,
  ExternalOrderDiscount,
  ExternalOrderItem,
  ExternalOrderModifier,
  ExternalOrderPayment
} from '@vero/business-sales';

export type AnotaAiMoneyUnit = 'MAJOR' | 'MINOR';
export type AnotaAiOrderTranslationErrorCode =
  | 'INVALID_ORDER'
  | 'INVALID_MONEY'
  | 'UNSUPPORTED_ADDITIONAL_FEES';

export interface TranslateAnotaAiOrderOptions {
  readonly pageId: string;
  readonly moneyUnit: AnotaAiMoneyUnit;
}

export class AnotaAiOrderTranslationError extends Error {
  constructor(
    readonly code: AnotaAiOrderTranslationErrorCode,
    readonly field: string
  ) {
    super(`Anota AI order cannot be translated: ${field}.`);
    this.name = 'AnotaAiOrderTranslationError';
  }
}

export function translateAnotaAiOrder(
  value: unknown,
  options: TranslateAnotaAiOrderOptions
): ExternalOrder {
  if (options.moneyUnit !== 'MAJOR' && options.moneyUnit !== 'MINOR') {
    fail('INVALID_MONEY', 'moneyUnit');
  }
  const order = record(value, '$');
  const pageId = text(options.pageId, 'pageId', 128);
  const orderExternalId = text(order['id'], 'id', 256);
  const merchant = record(order['merchant'], 'merchant');
  const customer = record(order['customer'], 'customer');
  const additionalFees = array(order['additionalFees'], 'additionalFees');
  if (additionalFees.length > 0) fail('UNSUPPORTED_ADDITIONAL_FEES', 'additionalFees');

  return Object.freeze({
    currency: 'BRL',
    identity: Object.freeze({
      provider: 'ANOTA_AI',
      establishmentExternalId: pageId,
      orderExternalId,
      idempotencyKey: idempotencyKey(pageId, orderExternalId),
      reference: String(nonNegativeInteger(order['shortReference'], 'shortReference'))
    }),
    merchant: Object.freeze({
      externalId: text(merchant['id'], 'merchant.id', 256),
      name: text(merchant['name'], 'merchant.name', 256),
      unit: text(merchant['unit'], 'merchant.unit', 256, true)
    }),
    source: Object.freeze({
      salesChannel: text(order['salesChannel'], 'salesChannel', 128),
      origin: text(order['from'], 'from', 128),
      type: text(order['type'], 'type', 128),
      menuVersion: nonNegativeInteger(order['menu_version'], 'menu_version')
    }),
    createdAt: dateTime(order['createdAt'], 'createdAt'),
    updatedAt: dateTime(order['updatedAt'], 'updatedAt'),
    items: Object.freeze(
      array(order['items'], 'items').map((item, index) => mapItem(item, index, options.moneyUnit))
    ),
    discounts: Object.freeze(
      array(order['discounts'], 'discounts').map((discount, index) =>
        mapDiscount(discount, index, options.moneyUnit)
      )
    ),
    deliveryFeeCents: money(order['deliveryFee'], options.moneyUnit, 'deliveryFee'),
    additionalFeesCents: Object.freeze([]),
    payments: Object.freeze(
      array(order['payments'], 'payments').map((payment, index) =>
        mapPayment(payment, index, options.moneyUnit)
      )
    ),
    totalCents: money(order['total'], options.moneyUnit, 'total'),
    customer: Object.freeze({
      name: text(customer['name'], 'customer.name', 256),
      phone: text(customer['phone'], 'customer.phone', 64)
    }),
    ...(order['deliveryAddress'] === undefined || order['deliveryAddress'] === null
      ? {}
      : { deliveryAddress: mapDeliveryAddress(order['deliveryAddress']) })
  });
}

function mapItem(value: unknown, index: number, unit: AnotaAiMoneyUnit): ExternalOrderItem {
  const path = `items[${index}]`;
  const item = record(value, path);
  const providerItemId = String(nonNegativeInteger(item['id'], `${path}.id`));
  return Object.freeze({
    providerItemId,
    externalId: text(item['externalId'], `${path}.externalId`, 256),
    internalId: text(item['internalId'], `${path}.internalId`, 256),
    backofficeId: text(item['backoffice_id'], `${path}.backoffice_id`, 256),
    name: text(item['name'], `${path}.name`, 512),
    quantity: positiveInteger(item['quantity'], `${path}.quantity`),
    unitPriceCents: money(item['price'], unit, `${path}.price`),
    totalCents: money(item['total'], unit, `${path}.total`),
    modifiers: Object.freeze(
      array(item['subItems'], `${path}.subItems`).map((modifier, modifierIndex) =>
        mapModifier(modifier, modifierIndex, path, providerItemId, unit)
      )
    )
  });
}

function mapModifier(
  value: unknown,
  index: number,
  itemPath: string,
  parentProviderItemId: string,
  unit: AnotaAiMoneyUnit
): ExternalOrderModifier {
  const path = `${itemPath}.subItems[${index}]`;
  const modifier = record(value, path);
  const parentId = String(nonNegativeInteger(modifier['id_parent'], `${path}.id_parent`));
  if (parentId !== parentProviderItemId) fail('INVALID_ORDER', `${path}.id_parent`);
  return Object.freeze({
    providerItemId: String(nonNegativeInteger(modifier['id'], `${path}.id`)),
    parentProviderItemId: parentId,
    externalId: text(modifier['externalId'], `${path}.externalId`, 256),
    internalId: text(modifier['internalId'], `${path}.internalId`, 256),
    backofficeId: text(modifier['backoffice_id'], `${path}.backoffice_id`, 256),
    name: text(modifier['name'], `${path}.name`, 512),
    quantity: positiveInteger(modifier['quantity'], `${path}.quantity`),
    unitPriceCents: money(modifier['price'], unit, `${path}.price`),
    totalCents: money(modifier['total'], unit, `${path}.total`)
  });
}

function mapDiscount(value: unknown, index: number, unit: AnotaAiMoneyUnit): ExternalOrderDiscount {
  const path = `discounts[${index}]`;
  const discount = record(value, path);
  return Object.freeze({
    amountCents: money(discount['amount'], unit, `${path}.amount`),
    tag: text(discount['tag'], `${path}.tag`, 256)
  });
}

function mapPayment(value: unknown, index: number, unit: AnotaAiMoneyUnit): ExternalOrderPayment {
  const path = `payments[${index}]`;
  const payment = record(value, path);
  const changeFor = payment['changeFor'];
  return Object.freeze({
    externalId: text(payment['externalId'], `${path}.externalId`, 256),
    code: text(payment['code'], `${path}.code`, 128),
    name: text(payment['name'], `${path}.name`, 256),
    card: text(payment['cardSelected'], `${path}.cardSelected`, 128, true),
    prepaid: booleanValue(payment['prepaid'], `${path}.prepaid`),
    ...(changeFor === null || changeFor === undefined
      ? {}
      : { changeForCents: money(changeFor, unit, `${path}.changeFor`) }),
    amountCents: money(payment['value'], unit, `${path}.value`)
  });
}

function mapDeliveryAddress(value: unknown): ExternalOrderDeliveryAddress {
  const address = record(value, 'deliveryAddress');
  const coordinates = record(address['coordinates'], 'deliveryAddress.coordinates');
  return Object.freeze({
    formattedAddress: text(address['formattedAddress'], 'deliveryAddress.formattedAddress', 1024),
    streetName: text(address['streetName'], 'deliveryAddress.streetName', 512),
    streetNumber: text(address['streetNumber'], 'deliveryAddress.streetNumber', 64),
    complement: text(address['complement'], 'deliveryAddress.complement', 512, true),
    neighborhood: text(address['neighborhood'], 'deliveryAddress.neighborhood', 256),
    city: text(address['city'], 'deliveryAddress.city', 256),
    state: text(address['state'], 'deliveryAddress.state', 128),
    country: text(address['country'], 'deliveryAddress.country', 128),
    postalCode: text(address['postalCode'], 'deliveryAddress.postalCode', 32),
    latitude: finiteNumber(coordinates['latitude'], 'deliveryAddress.coordinates.latitude'),
    longitude: finiteNumber(coordinates['longitude'], 'deliveryAddress.coordinates.longitude')
  });
}

function idempotencyKey(pageId: string, orderId: string): string {
  const digest = createHash('sha256')
    .update('anota-ai')
    .update('\0')
    .update(pageId)
    .update('\0')
    .update(orderId)
    .digest('hex');
  return `anota-ai:${digest}`;
}

function money(value: unknown, unit: AnotaAiMoneyUnit, field: string): number {
  const normalized =
    typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value.trim().replace(',', '.')
        : '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) fail('INVALID_MONEY', field);
  const [whole = '', fraction = ''] = normalized.split('.');
  const cents =
    unit === 'MAJOR'
      ? Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
      : fraction.length === 0
        ? Number(whole)
        : Number.NaN;
  if (!Number.isSafeInteger(cents) || cents < 0) fail('INVALID_MONEY', field);
  return cents;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('INVALID_ORDER', field);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) fail('INVALID_ORDER', field);
  return value;
}

function text(value: unknown, field: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== 'string') fail('INVALID_ORDER', field);
  const normalized = value.trim();
  if ((!allowEmpty && normalized.length === 0) || normalized.length > maximum) {
    fail('INVALID_ORDER', field);
  }
  return normalized;
}

function positiveInteger(value: unknown, field: string): number {
  const normalized = nonNegativeInteger(value, field);
  if (normalized === 0) fail('INVALID_ORDER', field);
  return normalized;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail('INVALID_ORDER', field);
  }
  return value;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('INVALID_ORDER', field);
  return value;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail('INVALID_ORDER', field);
  return value;
}

function dateTime(value: unknown, field: string): string {
  const normalized = text(value, field, 64);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) fail('INVALID_ORDER', field);
  return parsed.toISOString();
}

function fail(code: AnotaAiOrderTranslationErrorCode, field: string): never {
  throw new AnotaAiOrderTranslationError(code, field);
}
