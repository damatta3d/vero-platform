import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';

import {
  ExternalOrderInboxError,
  type ExternalOrderInboxItem,
  type ExternalOrderInboxListQuery,
  type ExternalOrderInboxPage,
  type ExternalOrderInboxRecord,
  type ExternalOrderInboxRepository,
  type ExternalOrderMappingStatus,
  type ExternalOrderOperationalStatus,
  type ExternalOrderReceiveResult,
  type PersistExternalOrderReceiptInput
} from '@vero/business-sales';

type DatabaseClient = InstanceType<typeof PrismaClient>;
type TransactionClient = Prisma.TransactionClient;

type ExternalOrderRow = {
  id: string;
  tenantId: string;
  provider: string;
  establishmentExternalId: string;
  externalOrderId: string;
  reference: string;
  customerDisplayName: string | null;
  orderType: string;
  salesChannel: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  additionalFeesCents: number;
  totalCents: number;
  items: Prisma.JsonValue;
  operationalStatus: string;
  providerStatus: string | null;
  mappingStatus: string;
  occurredAt: Date;
  lastObservedAt: Date;
  sourceRevision: string;
  statusUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaExternalOrderInboxRepository implements ExternalOrderInboxRepository {
  constructor(private readonly client: DatabaseClient) {}

  async receive(input: PersistExternalOrderReceiptInput): Promise<ExternalOrderReceiveResult> {
    return this.withSerializableRetry(async (transaction) => {
      const payloadHash = fingerprint(input);
      const existing = await transaction.externalOrderInbox.findUnique({
        where: {
          tenantId_provider_establishmentExternalId_externalOrderId: {
            tenantId: input.tenantId,
            provider: input.provider,
            establishmentExternalId: input.establishmentExternalId,
            externalOrderId: input.externalOrderId
          }
        }
      });

      if (existing === null) {
        const created = await transaction.externalOrderInbox.create({
          data: {
            tenantId: input.tenantId,
            provider: input.provider,
            establishmentExternalId: input.establishmentExternalId,
            externalOrderId: input.externalOrderId,
            ...snapshotData(input),
            operationalStatus: 'RECEIVED',
            ...(input.providerStatus === undefined ? {} : { providerStatus: input.providerStatus }),
            mappingStatus: input.mappingStatus,
            occurredAt: input.occurredAt,
            lastObservedAt: input.observedAt,
            sourceRevision: input.sourceRevision,
            statusUpdatedAt: input.observedAt,
            updatedAt: input.observedAt
          }
        });
        await createReceipt(transaction, created.id, input, payloadHash);
        return Object.freeze({ disposition: 'CREATED' as const, order: fromRow(created) });
      }

      const receipt = await transaction.externalOrderReceipt.findUnique({
        where: {
          orderId_sourceRevision: {
            orderId: existing.id,
            sourceRevision: input.sourceRevision
          }
        }
      });
      if (receipt !== null) {
        if (receipt.payloadHash !== payloadHash) {
          throw new ExternalOrderInboxError('SOURCE_REVISION_CONFLICT', 'sourceRevision');
        }
        return Object.freeze({ disposition: 'REPLAY' as const, order: fromRow(existing) });
      }

      if (input.observedAt.getTime() < existing.lastObservedAt.getTime()) {
        await createReceipt(transaction, existing.id, input, payloadHash);
        return Object.freeze({ disposition: 'STALE' as const, order: fromRow(existing) });
      }

      if (input.observedAt.getTime() === existing.lastObservedAt.getTime()) {
        throw new ExternalOrderInboxError('SOURCE_REVISION_CONFLICT', 'observedAt');
      }

      await createReceipt(transaction, existing.id, input, payloadHash);
      const updated = await transaction.externalOrderInbox.update({
        where: { id: existing.id },
        data: {
          ...snapshotData(input),
          ...(input.providerStatus === undefined
            ? { providerStatus: null }
            : { providerStatus: input.providerStatus }),
          mappingStatus: input.mappingStatus,
          occurredAt: input.occurredAt,
          lastObservedAt: input.observedAt,
          sourceRevision: input.sourceRevision,
          updatedAt: input.observedAt
        }
      });
      return Object.freeze({ disposition: 'UPDATED' as const, order: fromRow(updated) });
    });
  }

  async list(
    tenantId: string,
    query: ExternalOrderInboxListQuery
  ): Promise<ExternalOrderInboxPage> {
    const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor);
    const where: Prisma.ExternalOrderInboxWhereInput = {
      tenantId,
      ...(query.provider === undefined ? {} : { provider: query.provider }),
      ...(query.status === undefined ? {} : { operationalStatus: query.status }),
      ...(query.mappingStatus === undefined ? {} : { mappingStatus: query.mappingStatus }),
      ...(cursor === undefined
        ? {}
        : {
            OR: [
              { occurredAt: { lt: cursor.occurredAt } },
              { occurredAt: cursor.occurredAt, id: { lt: cursor.id } }
            ]
          })
    };
    const rows = await this.client.externalOrderInbox.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1
    });
    const hasNext = rows.length > query.limit;
    const visible = hasNext ? rows.slice(0, query.limit) : rows;
    const last = visible[visible.length - 1];
    return Object.freeze({
      items: Object.freeze(visible.map(fromRow)),
      ...(hasNext && last !== undefined
        ? { nextCursor: encodeCursor(last.occurredAt, last.id) }
        : {})
    });
  }

  async find(tenantId: string, id: string): Promise<ExternalOrderInboxRecord | undefined> {
    const row = await this.client.externalOrderInbox.findFirst({ where: { tenantId, id } });
    return row === null ? undefined : fromRow(row);
  }

  async remap(
    tenantId: string,
    id: string,
    items: readonly ExternalOrderInboxItem[],
    mappingStatus: ExternalOrderMappingStatus,
    at: Date
  ): Promise<ExternalOrderInboxRecord | undefined> {
    const result = await this.client.externalOrderInbox.updateMany({
      where: { tenantId, id },
      data: {
        items: items as unknown as Prisma.InputJsonValue,
        mappingStatus,
        updatedAt: at
      }
    });
    if (result.count !== 1) return undefined;
    return this.find(tenantId, id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: ExternalOrderOperationalStatus,
    at: Date
  ): Promise<ExternalOrderInboxRecord | undefined> {
    const result = await this.client.externalOrderInbox.updateMany({
      where: { tenantId, id },
      data: { operationalStatus: status, statusUpdatedAt: at, updatedAt: at }
    });
    if (result.count !== 1) return undefined;
    return this.find(tenantId, id);
  }

  private async withSerializableRetry<T>(
    operation: (transaction: TransactionClient) => Promise<T>
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await this.client.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
      } catch (error) {
        if (attempt < 3 && isRetryablePrismaError(error)) continue;
        throw error;
      }
    }
    throw new Error('External order transaction retry budget exhausted.');
  }
}

function snapshotData(input: PersistExternalOrderReceiptInput) {
  return {
    reference: input.snapshot.reference,
    ...(input.snapshot.customerDisplayName === undefined
      ? { customerDisplayName: null }
      : { customerDisplayName: input.snapshot.customerDisplayName }),
    orderType: input.snapshot.orderType,
    salesChannel: input.snapshot.salesChannel,
    currency: input.snapshot.currency,
    subtotalCents: input.snapshot.subtotalCents,
    discountCents: input.snapshot.discountCents,
    deliveryFeeCents: input.snapshot.deliveryFeeCents,
    additionalFeesCents: input.snapshot.additionalFeesCents,
    totalCents: input.snapshot.totalCents,
    items: input.snapshot.items as unknown as Prisma.InputJsonValue
  };
}

async function createReceipt(
  transaction: TransactionClient,
  orderId: string,
  input: PersistExternalOrderReceiptInput,
  payloadHash: string
): Promise<void> {
  await transaction.externalOrderReceipt.create({
    data: {
      orderId,
      sourceRevision: input.sourceRevision,
      observedAt: input.observedAt,
      occurredAt: input.occurredAt,
      ...(input.providerStatus === undefined ? {} : { providerStatus: input.providerStatus }),
      payloadHash,
      snapshot: input.snapshot as unknown as Prisma.InputJsonValue
    }
  });
}

function fingerprint(input: PersistExternalOrderReceiptInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        occurredAt: input.occurredAt.toISOString(),
        providerStatus: input.providerStatus ?? null,
        mappingStatus: input.mappingStatus,
        snapshot: input.snapshot
      })
    )
    .digest('hex');
}

function fromRow(row: ExternalOrderRow): ExternalOrderInboxRecord {
  const items = row.items as unknown as readonly ExternalOrderInboxItem[];
  return Object.freeze({
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider,
    establishmentExternalId: row.establishmentExternalId,
    externalOrderId: row.externalOrderId,
    reference: row.reference,
    ...(row.customerDisplayName === null ? {} : { customerDisplayName: row.customerDisplayName }),
    orderType: row.orderType,
    salesChannel: row.salesChannel,
    currency: row.currency as 'BRL',
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    deliveryFeeCents: row.deliveryFeeCents,
    additionalFeesCents: row.additionalFeesCents,
    totalCents: row.totalCents,
    items: Object.freeze(items),
    operationalStatus: row.operationalStatus as ExternalOrderOperationalStatus,
    ...(row.providerStatus === null ? {} : { providerStatus: row.providerStatus }),
    mappingStatus: row.mappingStatus as ExternalOrderMappingStatus,
    occurredAt: row.occurredAt,
    lastObservedAt: row.lastObservedAt,
    sourceRevision: row.sourceRevision,
    statusUpdatedAt: row.statusUpdatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

function encodeCursor(occurredAt: Date, id: string): string {
  return Buffer.from(`${occurredAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(value: string): Readonly<{ occurredAt: Date; id: string }> {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    if (separator <= 0) throw new Error('invalid cursor');
    const occurredAt = new Date(decoded.slice(0, separator));
    const id = decoded.slice(separator + 1);
    if (Number.isNaN(occurredAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new Error('invalid cursor');
    }
    return Object.freeze({ occurredAt, id });
  } catch {
    throw new ExternalOrderInboxError('INVALID_INPUT', 'cursor');
  }
}

function isRetryablePrismaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { readonly code?: unknown }).code;
  return code === 'P2034' || code === 'P2002';
}
