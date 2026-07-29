import { createHash } from 'node:crypto';

import { Prisma, type PrismaClient } from '@prisma/client';

import {
  ChannelOrderFactPersistenceError,
  type AppendChannelOrderFactResult,
  type ChannelOrderAdjustmentFact,
  type ChannelOrderFact,
  type ChannelOrderFactIdentity,
  type ChannelOrderFactProvenance,
  type ChannelOrderFactRepository,
  type ChannelOrderLineFact,
  type PersistedChannelOrderFact
} from '@vero/business-intelligence';

type DatabaseClient = InstanceType<typeof PrismaClient>;
type TransactionClient = Prisma.TransactionClient;
type ChannelOrderFactRow = Prisma.IntelligenceChannelOrderFactGetPayload<{
  include: {
    lines: true;
    adjustments: true;
  };
}>;

export interface ChannelOrderFactPersistenceClock {
  now(): Date;
}

const includeChildren = {
  lines: { orderBy: { ordinal: Prisma.SortOrder.asc } },
  adjustments: { orderBy: { ordinal: Prisma.SortOrder.asc } }
} satisfies Prisma.IntelligenceChannelOrderFactInclude;

export class PrismaChannelOrderFactRepository implements ChannelOrderFactRepository {
  constructor(
    private readonly client: DatabaseClient,
    private readonly clock: ChannelOrderFactPersistenceClock = { now: () => new Date() }
  ) {}

  async append(
    fact: ChannelOrderFact,
    provenanceValue: ChannelOrderFactProvenance
  ): Promise<AppendChannelOrderFactResult> {
    const provenance = validatedProvenance(provenanceValue);
    const revision = validDate(fact.revision, 'fact.revision');
    const semanticHash = hashFact(fact, provenance.schemaVersion);
    const persistedAt = validDate(this.clock.now(), 'persistedAt');

    return this.client.$transaction(async (transaction) => {
      const inserted = await transaction.intelligenceChannelOrderFact.createMany({
        data: [
          {
            tenantId: fact.tenantId,
            connectionId: fact.connectionId,
            orderKey: fact.orderKey,
            revision,
            provider: fact.provider,
            establishmentExternalId: fact.establishmentExternalId,
            currency: fact.currency,
            occurredAt: fact.occurredAt,
            observedAt: fact.observedAt,
            salesChannel: fact.salesChannel,
            orderType: fact.orderType,
            menuVersion: fact.menuVersion,
            totalCents: fact.totalCents,
            semanticHash,
            receiptId: provenance.receiptId,
            ingestionRunId: provenance.ingestionRunId,
            schemaVersion: provenance.schemaVersion,
            persistedAt
          }
        ],
        skipDuplicates: true
      });

      if (inserted.count === 0) {
        const existing = await findRow(transaction, {
          tenantId: fact.tenantId,
          connectionId: fact.connectionId,
          orderKey: fact.orderKey,
          revision: fact.revision
        });
        if (!existing || existing.semanticHash !== semanticHash) {
          throw new ChannelOrderFactPersistenceError('IDEMPOTENCY_CONFLICT', 'fact.identity');
        }
        return result('REPLAYED', fromRow(existing));
      }

      if (fact.lines.length > 0) {
        await transaction.intelligenceChannelOrderLineFact.createMany({
          data: fact.lines.map((line, ordinal) => ({
            tenantId: fact.tenantId,
            connectionId: fact.connectionId,
            orderKey: fact.orderKey,
            revision,
            ordinal,
            ...line
          }))
        });
      }
      if (fact.adjustments.length > 0) {
        await transaction.intelligenceChannelOrderAdjustmentFact.createMany({
          data: fact.adjustments.map((adjustment, ordinal) => ({
            tenantId: fact.tenantId,
            connectionId: fact.connectionId,
            orderKey: fact.orderKey,
            revision,
            ordinal,
            ...adjustment
          }))
        });
      }

      const row = await findRow(transaction, {
        tenantId: fact.tenantId,
        connectionId: fact.connectionId,
        orderKey: fact.orderKey,
        revision: fact.revision
      });
      if (!row) {
        throw new ChannelOrderFactPersistenceError('IDEMPOTENCY_CONFLICT', 'fact.persistence');
      }
      return result('INSERTED', fromRow(row));
    });
  }

  async findRevision(
    identity: ChannelOrderFactIdentity
  ): Promise<PersistedChannelOrderFact | undefined> {
    const row = await findRow(this.client, identity);
    return row ? fromRow(row) : undefined;
  }
}

function result(
  status: AppendChannelOrderFactResult['status'],
  persisted: PersistedChannelOrderFact
): AppendChannelOrderFactResult {
  return Object.freeze({ status, persisted });
}

async function findRow(
  client: TransactionClient | DatabaseClient,
  identity: ChannelOrderFactIdentity
): Promise<ChannelOrderFactRow | null> {
  return client.intelligenceChannelOrderFact.findUnique({
    where: {
      tenantId_connectionId_orderKey_revision: {
        tenantId: requiredText(identity.tenantId, 'identity.tenantId', 128),
        connectionId: requiredText(identity.connectionId, 'identity.connectionId', 128),
        orderKey: requiredText(identity.orderKey, 'identity.orderKey', 256),
        revision: validDate(identity.revision, 'identity.revision')
      }
    },
    include: includeChildren
  });
}

function fromRow(row: ChannelOrderFactRow): PersistedChannelOrderFact {
  const lines = row.lines.map<ChannelOrderLineFact>((line) =>
    Object.freeze({
      kind: line.kind as ChannelOrderLineFact['kind'],
      providerItemId: line.providerItemId,
      ...(line.parentProviderItemId === null
        ? {}
        : { parentProviderItemId: line.parentProviderItemId }),
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.totalCents
    })
  );
  const adjustments = row.adjustments.map<ChannelOrderAdjustmentFact>((adjustment) =>
    Object.freeze({
      kind: adjustment.kind as ChannelOrderAdjustmentFact['kind'],
      amountCents: adjustment.amountCents,
      label: adjustment.label
    })
  );
  const fact: ChannelOrderFact = Object.freeze({
    tenantId: row.tenantId,
    connectionId: row.connectionId,
    provider: row.provider,
    establishmentExternalId: row.establishmentExternalId,
    orderKey: row.orderKey,
    revision: row.revision.toISOString(),
    currency: row.currency as ChannelOrderFact['currency'],
    occurredAt: row.occurredAt,
    observedAt: row.observedAt,
    salesChannel: row.salesChannel,
    orderType: row.orderType,
    menuVersion: row.menuVersion,
    lines: Object.freeze(lines),
    adjustments: Object.freeze(adjustments),
    totalCents: row.totalCents
  });

  return Object.freeze({
    fact,
    provenance: Object.freeze({
      receiptId: row.receiptId,
      ingestionRunId: row.ingestionRunId,
      schemaVersion: row.schemaVersion
    }),
    semanticHash: row.semanticHash,
    persistedAt: row.persistedAt
  });
}

function hashFact(fact: ChannelOrderFact, schemaVersion: string): string {
  const semanticValue = {
    schemaVersion,
    tenantId: fact.tenantId,
    connectionId: fact.connectionId,
    provider: fact.provider,
    establishmentExternalId: fact.establishmentExternalId,
    orderKey: fact.orderKey,
    revision: validDate(fact.revision, 'fact.revision').toISOString(),
    currency: fact.currency,
    occurredAt: fact.occurredAt.toISOString(),
    salesChannel: fact.salesChannel,
    orderType: fact.orderType,
    menuVersion: fact.menuVersion,
    lines: fact.lines,
    adjustments: fact.adjustments,
    totalCents: fact.totalCents
  };
  return createHash('sha256').update(JSON.stringify(semanticValue)).digest('hex');
}

function validatedProvenance(value: ChannelOrderFactProvenance): ChannelOrderFactProvenance {
  return Object.freeze({
    receiptId: requiredText(value.receiptId, 'provenance.receiptId', 256),
    ingestionRunId: requiredText(value.ingestionRunId, 'provenance.ingestionRunId', 256),
    schemaVersion: requiredText(value.schemaVersion, 'provenance.schemaVersion', 64)
  });
}

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new ChannelOrderFactPersistenceError('INVALID_PROVENANCE', field);
  }
  return normalized;
}

function validDate(value: Date | string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ChannelOrderFactPersistenceError('INVALID_PROVENANCE', field);
  }
  return date;
}
