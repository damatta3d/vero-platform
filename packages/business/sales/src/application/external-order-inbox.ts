import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';

import type {
  ExternalCatalogLink,
  ExternalCatalogLinkRepository
} from './external-catalog-link-service.js';
import type { ExternalOrder } from './external-order.js';

export type ExternalOrderOperationalStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ExternalOrderMappingStatus = 'MAPPED' | 'REVIEW_REQUIRED';
export type ExternalOrderReceiveDisposition = 'CREATED' | 'UPDATED' | 'REPLAY' | 'STALE';

export type ExternalOrderInboxErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'CATALOG_MAPPING_REQUIRED'
  | 'SOURCE_REVISION_CONFLICT'
  | 'UNAUTHORIZED';

export class ExternalOrderInboxError extends Error {
  constructor(
    readonly code: ExternalOrderInboxErrorCode,
    readonly field?: string
  ) {
    super(field === undefined ? code : `${code}: ${field}`);
    this.name = 'ExternalOrderInboxError';
  }
}

export interface ExternalOrderInboxModifier {
  readonly providerItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly catalogProductId?: string;
}

export interface ExternalOrderInboxItem {
  readonly providerItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly catalogProductId?: string;
  readonly modifiers: readonly ExternalOrderInboxModifier[];
}

export interface ExternalOrderInboxSnapshot {
  readonly reference: string;
  readonly customerDisplayName?: string;
  readonly orderType: string;
  readonly salesChannel: string;
  readonly currency: 'BRL';
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly deliveryFeeCents: number;
  readonly additionalFeesCents: number;
  readonly totalCents: number;
  readonly items: readonly ExternalOrderInboxItem[];
}

export interface ExternalOrderInboxRecord extends ExternalOrderInboxSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly externalOrderId: string;
  readonly operationalStatus: ExternalOrderOperationalStatus;
  readonly providerStatus?: string;
  readonly mappingStatus: ExternalOrderMappingStatus;
  readonly occurredAt: Date;
  readonly lastObservedAt: Date;
  readonly sourceRevision: string;
  readonly statusUpdatedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReceiveExternalOrderInput {
  readonly order: ExternalOrder;
  readonly providerStatus?: string;
  readonly sourceRevision?: string;
  readonly observedAt?: Date;
}

export interface PersistExternalOrderReceiptInput {
  readonly tenantId: string;
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly externalOrderId: string;
  readonly sourceRevision: string;
  readonly observedAt: Date;
  readonly occurredAt: Date;
  readonly providerStatus?: string;
  readonly mappingStatus: ExternalOrderMappingStatus;
  readonly snapshot: ExternalOrderInboxSnapshot;
}

export interface ExternalOrderReceiveResult {
  readonly disposition: ExternalOrderReceiveDisposition;
  readonly order: ExternalOrderInboxRecord;
}

export interface ExternalOrderInboxListQuery {
  readonly limit: number;
  readonly cursor?: string;
  readonly provider?: string;
  readonly status?: ExternalOrderOperationalStatus;
  readonly mappingStatus?: ExternalOrderMappingStatus;
}

export interface ExternalOrderInboxPage {
  readonly items: readonly ExternalOrderInboxRecord[];
  readonly nextCursor?: string;
}

export interface ExternalOrderInboxRepository {
  receive(input: PersistExternalOrderReceiptInput): Promise<ExternalOrderReceiveResult>;
  list(tenantId: string, query: ExternalOrderInboxListQuery): Promise<ExternalOrderInboxPage>;
  find(tenantId: string, id: string): Promise<ExternalOrderInboxRecord | undefined>;
  remap(
    tenantId: string,
    id: string,
    items: readonly ExternalOrderInboxItem[],
    mappingStatus: ExternalOrderMappingStatus,
    at: Date
  ): Promise<ExternalOrderInboxRecord | undefined>;
  updateStatus(
    tenantId: string,
    id: string,
    status: ExternalOrderOperationalStatus,
    at: Date
  ): Promise<ExternalOrderInboxRecord | undefined>;
}

export interface ExternalOrderInboxClock {
  now(): Date;
}

const transitions: Readonly<Record<ExternalOrderOperationalStatus, readonly ExternalOrderOperationalStatus[]>> =
  Object.freeze({
    RECEIVED: Object.freeze(['CONFIRMED', 'CANCELLED']),
    CONFIRMED: Object.freeze(['PREPARING', 'CANCELLED']),
    PREPARING: Object.freeze(['READY', 'CANCELLED']),
    READY: Object.freeze(['DISPATCHED', 'COMPLETED', 'CANCELLED']),
    DISPATCHED: Object.freeze(['COMPLETED', 'CANCELLED']),
    COMPLETED: Object.freeze([]),
    CANCELLED: Object.freeze([])
  });

export class ExternalOrderInboxService {
  constructor(
    private readonly repository: ExternalOrderInboxRepository,
    private readonly links: ExternalCatalogLinkRepository,
    private readonly clock: ExternalOrderInboxClock
  ) {}

  async receive(
    access: AuthorizedAccessContext,
    input: ReceiveExternalOrderInput
  ): Promise<ExternalOrderReceiveResult> {
    const tenantId = authorize(access, 'orders.intake');
    const provider = requiredText(input.order.identity.provider, 'order.identity.provider', 64);
    const establishmentExternalId = requiredText(
      input.order.identity.establishmentExternalId,
      'order.identity.establishmentExternalId',
      256
    );
    const externalOrderId = requiredText(
      input.order.identity.orderExternalId,
      'order.identity.orderExternalId',
      256
    );
    const observedAt = input.observedAt ?? this.clock.now();
    requireDate(observedAt, 'observedAt');
    const occurredAt = parseDate(input.order.createdAt, 'order.createdAt');
    const sourceRevision = requiredText(
      input.sourceRevision ?? input.order.updatedAt,
      'sourceRevision',
      256
    );
    const providerStatus = optionalText(input.providerStatus, 'providerStatus', 128);
    const catalogLinks = await this.links.list(tenantId, provider, establishmentExternalId);
    const resolved = buildSnapshot(input.order, catalogLinks);

    return this.repository.receive({
      tenantId,
      provider,
      establishmentExternalId,
      externalOrderId,
      sourceRevision,
      observedAt,
      occurredAt,
      ...(providerStatus === undefined ? {} : { providerStatus }),
      mappingStatus: resolved.mappingStatus,
      snapshot: resolved.snapshot
    });
  }

  async list(
    access: AuthorizedAccessContext,
    query: ExternalOrderInboxListQuery
  ): Promise<ExternalOrderInboxPage> {
    const tenantId = authorize(access, 'orders.read');
    if (!Number.isInteger(query.limit) || query.limit <= 0 || query.limit > 100) {
      fail('INVALID_INPUT', 'limit');
    }
    return this.repository.list(tenantId, query);
  }

  async get(access: AuthorizedAccessContext, id: string): Promise<ExternalOrderInboxRecord> {
    const tenantId = authorize(access, 'orders.read');
    requiredText(id, 'id', 64);
    const order = await this.repository.find(tenantId, id);
    if (order === undefined) fail('NOT_FOUND', 'id');
    return order;
  }

  async changeStatus(
    access: AuthorizedAccessContext,
    id: string,
    target: ExternalOrderOperationalStatus
  ): Promise<ExternalOrderInboxRecord> {
    const tenantId = authorize(access, 'orders.update');
    requiredText(id, 'id', 64);
    requireOperationalStatus(target);
    let current = await this.repository.find(tenantId, id);
    if (current === undefined) fail('NOT_FOUND', 'id');

    if (target === current.operationalStatus) return current;
    if (!transitions[current.operationalStatus].includes(target)) {
      fail('INVALID_STATUS_TRANSITION', 'status');
    }

    if (target === 'CONFIRMED') {
      const links = await this.links.list(
        tenantId,
        current.provider,
        current.establishmentExternalId
      );
      const remapped = mapStoredItems(current.items, links);
      current =
        (await this.repository.remap(
          tenantId,
          current.id,
          remapped.items,
          remapped.mappingStatus,
          this.clock.now()
        )) ?? current;
      if (current.mappingStatus !== 'MAPPED') {
        fail('CATALOG_MAPPING_REQUIRED', 'items');
      }
    }

    const updated = await this.repository.updateStatus(tenantId, id, target, this.clock.now());
    if (updated === undefined) fail('NOT_FOUND', 'id');
    return updated;
  }
}

function buildSnapshot(
  order: ExternalOrder,
  links: readonly ExternalCatalogLink[]
): Readonly<{ snapshot: ExternalOrderInboxSnapshot; mappingStatus: ExternalOrderMappingStatus }> {
  if (order.currency !== 'BRL') fail('INVALID_INPUT', 'order.currency');
  if (!Array.isArray(order.items) || order.items.length === 0) fail('INVALID_INPUT', 'order.items');

  const linkMap = createLinkMap(links);
  let fullyMapped = true;
  const items = order.items.map((item, index) => {
    const mapped = mapItem(item, index, linkMap);
    fullyMapped = fullyMapped && mapped.mapped;
    return mapped.item;
  });
  const subtotalCents = safeSum(items.map((item) => item.totalCents), 'order.items');
  const discountCents = safeSum(
    order.discounts.map((discount, index) =>
      money(discount.amountCents, `order.discounts[${index}].amountCents`)
    ),
    'order.discounts'
  );
  const additionalFeesCents = safeSum(
    order.additionalFeesCents.map((fee, index) => money(fee, `order.additionalFeesCents[${index}]`)),
    'order.additionalFeesCents'
  );
  const customerDisplayName = minimizeCustomerName(order.customer.name);
  const snapshot: ExternalOrderInboxSnapshot = Object.freeze({
    reference: requiredText(order.identity.reference, 'order.identity.reference', 128),
    ...(customerDisplayName === undefined ? {} : { customerDisplayName }),
    orderType: requiredText(order.source.type, 'order.source.type', 128),
    salesChannel: requiredText(order.source.salesChannel, 'order.source.salesChannel', 128),
    currency: 'BRL',
    subtotalCents,
    discountCents,
    deliveryFeeCents: money(order.deliveryFeeCents, 'order.deliveryFeeCents'),
    additionalFeesCents,
    totalCents: money(order.totalCents, 'order.totalCents'),
    items: Object.freeze(items)
  });
  return Object.freeze({
    snapshot,
    mappingStatus: fullyMapped ? 'MAPPED' : 'REVIEW_REQUIRED'
  });
}

function mapStoredItems(
  items: readonly ExternalOrderInboxItem[],
  links: readonly ExternalCatalogLink[]
): Readonly<{ items: readonly ExternalOrderInboxItem[]; mappingStatus: ExternalOrderMappingStatus }> {
  const linkMap = createLinkMap(links);
  let fullyMapped = true;
  const mappedItems = items.map((item) => {
    const catalogProductId = linkMap.get(referenceKey('ITEM', item.providerItemId));
    if (catalogProductId === undefined) fullyMapped = false;
    const modifiers = item.modifiers.map((modifier) => {
      const modifierProductId = linkMap.get(referenceKey('MODIFIER', modifier.providerItemId));
      if (modifierProductId === undefined) fullyMapped = false;
      return Object.freeze({
        providerItemId: modifier.providerItemId,
        name: modifier.name,
        quantity: modifier.quantity,
        unitPriceCents: modifier.unitPriceCents,
        totalCents: modifier.totalCents,
        ...(modifierProductId === undefined ? {} : { catalogProductId: modifierProductId })
      });
    });
    return Object.freeze({
      providerItemId: item.providerItemId,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      ...(catalogProductId === undefined ? {} : { catalogProductId }),
      modifiers: Object.freeze(modifiers)
    });
  });
  return Object.freeze({
    items: Object.freeze(mappedItems),
    mappingStatus: fullyMapped ? 'MAPPED' : 'REVIEW_REQUIRED'
  });
}

function mapItem(
  item: ExternalOrder['items'][number],
  index: number,
  links: ReadonlyMap<string, string>
): Readonly<{ item: ExternalOrderInboxItem; mapped: boolean }> {
  const providerItemId = requiredText(item.providerItemId, `order.items[${index}].providerItemId`, 256);
  const catalogProductId = links.get(referenceKey('ITEM', providerItemId));
  let mapped = catalogProductId !== undefined;
  const modifiers = item.modifiers.map((modifier, modifierIndex) => {
    const modifierId = requiredText(
      modifier.providerItemId,
      `order.items[${index}].modifiers[${modifierIndex}].providerItemId`,
      256
    );
    const modifierProductId = links.get(referenceKey('MODIFIER', modifierId));
    mapped = mapped && modifierProductId !== undefined;
    return Object.freeze({
      providerItemId: modifierId,
      name: requiredText(
        modifier.name,
        `order.items[${index}].modifiers[${modifierIndex}].name`,
        512
      ),
      quantity: positiveInteger(
        modifier.quantity,
        `order.items[${index}].modifiers[${modifierIndex}].quantity`
      ),
      unitPriceCents: money(
        modifier.unitPriceCents,
        `order.items[${index}].modifiers[${modifierIndex}].unitPriceCents`
      ),
      totalCents: money(
        modifier.totalCents,
        `order.items[${index}].modifiers[${modifierIndex}].totalCents`
      ),
      ...(modifierProductId === undefined ? {} : { catalogProductId: modifierProductId })
    });
  });
  return Object.freeze({
    item: Object.freeze({
      providerItemId,
      name: requiredText(item.name, `order.items[${index}].name`, 512),
      quantity: positiveInteger(item.quantity, `order.items[${index}].quantity`),
      unitPriceCents: money(item.unitPriceCents, `order.items[${index}].unitPriceCents`),
      totalCents: money(item.totalCents, `order.items[${index}].totalCents`),
      ...(catalogProductId === undefined ? {} : { catalogProductId }),
      modifiers: Object.freeze(modifiers)
    }),
    mapped
  });
}

function createLinkMap(links: readonly ExternalCatalogLink[]): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (const link of links) {
    result.set(referenceKey(link.kind, link.providerItemId), link.catalogProductId);
  }
  return result;
}

function referenceKey(kind: 'ITEM' | 'MODIFIER', providerItemId: string): string {
  return `${kind}\0${providerItemId}`;
}

function minimizeCustomerName(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) return undefined;
  const parts = normalized.split(' ');
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const minimized = last === undefined || last.length === 0 ? first : `${first} ${last[0]}.`;
  return minimized.slice(0, 80);
}

function safeSum(values: readonly number[], field: string): number {
  let total = 0;
  for (const value of values) {
    total += value;
    if (!Number.isSafeInteger(total)) fail('INVALID_INPUT', field);
  }
  return total;
}

function money(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_INPUT', field);
  return value;
}

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) fail('INVALID_INPUT', field);
  return value;
}

function requiredText(value: string, field: string, maximum: number): string {
  if (typeof value !== 'string') fail('INVALID_INPUT', field);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) fail('INVALID_INPUT', field);
  return normalized;
}

function optionalText(value: string | undefined, field: string, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, field, maximum);
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  requireDate(date, field);
  return date;
}

function requireDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) fail('INVALID_INPUT', field);
}

function requireOperationalStatus(value: string): asserts value is ExternalOrderOperationalStatus {
  if (!(value in transitions)) fail('INVALID_INPUT', 'status');
}

function authorize(access: AuthorizedAccessContext, expectedAction: string): string {
  const authorized = consumeAuthorizedAccess(access);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'orders.operations'
  ) {
    fail('UNAUTHORIZED');
  }
  return authorized.request.tenant.tenantId.toString();
}

function fail(code: ExternalOrderInboxErrorCode, field?: string): never {
  throw new ExternalOrderInboxError(code, field);
}
