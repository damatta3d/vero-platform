import type { ExternalOrder } from '@vero/business-sales';

export type ChannelOrderLineKind = 'ITEM' | 'MODIFIER';
export type ChannelOrderAdjustmentKind = 'DISCOUNT' | 'DELIVERY_FEE';

export interface OrderPseudonymScope {
  readonly tenantId: string;
  readonly connectionId: string;
  readonly domain: 'ORDER';
}

export interface OrderPseudonymizer {
  pseudonymize(scope: OrderPseudonymScope, externalOrderId: string): string;
}

export interface ChannelOrderLineFact {
  readonly kind: ChannelOrderLineKind;
  readonly providerItemId: string;
  readonly parentProviderItemId?: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
}

export interface ChannelOrderAdjustmentFact {
  readonly kind: ChannelOrderAdjustmentKind;
  readonly amountCents: number;
  readonly label: string;
}

export interface ChannelOrderFact {
  readonly tenantId: string;
  readonly connectionId: string;
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly orderKey: string;
  readonly revision: string;
  readonly currency: 'BRL';
  readonly occurredAt: Date;
  readonly observedAt: Date;
  readonly salesChannel: string;
  readonly orderType: string;
  readonly menuVersion: number;
  readonly lines: readonly ChannelOrderLineFact[];
  readonly adjustments: readonly ChannelOrderAdjustmentFact[];
  readonly totalCents: number;
}

export interface ChannelOrderFactIdentity {
  readonly tenantId: string;
  readonly connectionId: string;
  readonly orderKey: string;
  readonly revision: string;
}

export interface ChannelOrderFactProvenance {
  readonly receiptId: string;
  readonly ingestionRunId: string;
  readonly schemaVersion: string;
}

export interface PersistedChannelOrderFact {
  readonly fact: ChannelOrderFact;
  readonly provenance: ChannelOrderFactProvenance;
  readonly semanticHash: string;
  readonly persistedAt: Date;
}

export type AppendChannelOrderFactStatus = 'INSERTED' | 'REPLAYED';

export interface AppendChannelOrderFactResult {
  readonly status: AppendChannelOrderFactStatus;
  readonly persisted: PersistedChannelOrderFact;
}

export interface ChannelOrderFactRepository {
  append(
    fact: ChannelOrderFact,
    provenance: ChannelOrderFactProvenance
  ): Promise<AppendChannelOrderFactResult>;
  findRevision(identity: ChannelOrderFactIdentity): Promise<PersistedChannelOrderFact | undefined>;
}

export type ChannelOrderFactPersistenceErrorCode = 'INVALID_PROVENANCE' | 'IDEMPOTENCY_CONFLICT';

export class ChannelOrderFactPersistenceError extends Error {
  constructor(
    readonly code: ChannelOrderFactPersistenceErrorCode,
    readonly field: string
  ) {
    super(`Channel order fact persistence failed: ${field}.`);
    this.name = 'ChannelOrderFactPersistenceError';
  }
}

export interface CreateChannelOrderFactInput {
  readonly tenantId: string;
  readonly connectionId: string;
  readonly order: ExternalOrder;
  readonly observedAt: Date;
}

export class InvalidChannelOrderFactError extends Error {
  constructor(readonly field: string) {
    super(`Invalid channel order fact: ${field}.`);
    this.name = 'InvalidChannelOrderFactError';
  }
}

export function createChannelOrderFact(
  input: CreateChannelOrderFactInput,
  pseudonymizer: OrderPseudonymizer
): ChannelOrderFact {
  const tenantId = requiredText(input.tenantId, 'tenantId', 128);
  const connectionId = requiredText(input.connectionId, 'connectionId', 128);
  const externalOrderId = requiredText(
    input.order.identity.orderExternalId,
    'order.identity.orderExternalId',
    256
  );
  const orderKey = requiredText(
    pseudonymizer.pseudonymize(
      Object.freeze({ tenantId, connectionId, domain: 'ORDER' }),
      externalOrderId
    ),
    'orderKey',
    256
  );
  if (orderKey === externalOrderId) throw new InvalidChannelOrderFactError('orderKey');

  const occurredAt = validDate(input.order.createdAt, 'order.createdAt');
  const revision = validDate(input.order.updatedAt, 'order.updatedAt').toISOString();
  const observedAt = validDate(input.observedAt, 'observedAt');
  if (observedAt.getTime() < occurredAt.getTime()) {
    throw new InvalidChannelOrderFactError('observedAt');
  }

  const lines = input.order.items.flatMap((item) => [
    lineFact('ITEM', item),
    ...item.modifiers.map((modifier) =>
      lineFact('MODIFIER', modifier, modifier.parentProviderItemId)
    )
  ]);
  if (lines.length === 0) throw new InvalidChannelOrderFactError('order.items');

  if (input.order.additionalFeesCents.length > 0) {
    throw new InvalidChannelOrderFactError('order.additionalFeesCents');
  }
  const adjustments: ChannelOrderAdjustmentFact[] = input.order.discounts.map((discount) =>
    Object.freeze({
      kind: 'DISCOUNT',
      amountCents: nonNegativeInteger(discount.amountCents, 'order.discounts.amountCents'),
      label: requiredText(discount.tag, 'order.discounts.tag', 256)
    })
  );
  const deliveryFeeCents = nonNegativeInteger(
    input.order.deliveryFeeCents,
    'order.deliveryFeeCents'
  );
  if (deliveryFeeCents > 0) {
    adjustments.push(
      Object.freeze({
        kind: 'DELIVERY_FEE',
        amountCents: deliveryFeeCents,
        label: 'Delivery'
      })
    );
  }

  return Object.freeze({
    tenantId,
    connectionId,
    provider: requiredText(input.order.identity.provider, 'order.identity.provider', 64),
    establishmentExternalId: requiredText(
      input.order.identity.establishmentExternalId,
      'order.identity.establishmentExternalId',
      256
    ),
    orderKey,
    revision,
    currency: input.order.currency,
    occurredAt,
    observedAt,
    salesChannel: requiredText(input.order.source.salesChannel, 'order.source.salesChannel', 128),
    orderType: requiredText(input.order.source.type, 'order.source.type', 128),
    menuVersion: nonNegativeInteger(input.order.source.menuVersion, 'order.source.menuVersion'),
    lines: Object.freeze(lines),
    adjustments: Object.freeze(adjustments),
    totalCents: nonNegativeInteger(input.order.totalCents, 'order.totalCents')
  });
}

function lineFact(
  kind: ChannelOrderLineKind,
  line: {
    readonly providerItemId: string;
    readonly name: string;
    readonly quantity: number;
    readonly unitPriceCents: number;
    readonly totalCents: number;
  },
  parentProviderItemId?: string
): ChannelOrderLineFact {
  return Object.freeze({
    kind,
    providerItemId: requiredText(line.providerItemId, 'order.lines.providerItemId', 256),
    ...(parentProviderItemId === undefined
      ? {}
      : {
          parentProviderItemId: requiredText(
            parentProviderItemId,
            'order.lines.parentProviderItemId',
            256
          )
        }),
    name: requiredText(line.name, 'order.lines.name', 512),
    quantity: positiveInteger(line.quantity, 'order.lines.quantity'),
    unitPriceCents: nonNegativeInteger(line.unitPriceCents, 'order.lines.unitPriceCents'),
    totalCents: nonNegativeInteger(line.totalCents, 'order.lines.totalCents')
  });
}

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new InvalidChannelOrderFactError(field);
  }
  return normalized;
}

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidChannelOrderFactError(field);
  }
  return value;
}

function nonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new InvalidChannelOrderFactError(field);
  }
  return value;
}

function validDate(value: Date | string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidChannelOrderFactError(field);
  return date;
}
