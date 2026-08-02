import { Prisma, type PrismaClient } from '@prisma/client';

type DatabaseClient = InstanceType<typeof PrismaClient>;

export type ExternalOrderProvider = 'ANOTA_AI' | 'IFOOD' | 'VERO_NATIVE';
export type ExternalOrderStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';
export type ExternalOrderMappingStatus = 'MAPPED' | 'PENDING_MAPPING';

export interface ExternalOrderInboxItem {
  readonly providerItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly mappedProductId: string | null;
  readonly modifiers: readonly {
    readonly providerItemId: string;
    readonly name: string;
    readonly quantity: number;
    readonly unitPriceCents: number;
    readonly totalCents: number;
    readonly mappedProductId: string | null;
  }[];
}

export interface ReceiveExternalOrderInput {
  readonly provider: ExternalOrderProvider;
  readonly establishmentExternalId: string;
  readonly externalOrderId: string;
  readonly reference: string;
  readonly customerName: string | null;
  readonly orderType: string;
  readonly salesChannel: string;
  readonly currency: 'BRL';
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly deliveryFeeCents: number;
  readonly totalCents: number;
  readonly items: readonly ExternalOrderInboxItem[];
  readonly occurredAt: Date;
  readonly observedAt: Date;
  readonly sourceRevision: string;
}

export interface ExternalOrderInboxRecord extends ReceiveExternalOrderInput {
  readonly tenantId: string;
  readonly status: ExternalOrderStatus;
  readonly mappingStatus: ExternalOrderMappingStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ExternalOrderInboxFilters {
  readonly provider?: ExternalOrderProvider;
  readonly status?: ExternalOrderStatus;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit: number;
}

const orderBy = [{ occurredAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }];

export class PrismaExternalOrderInboxRepository {
  constructor(private readonly client: DatabaseClient) {}

  async receive(tenantId: string, input: ReceiveExternalOrderInput): Promise<ExternalOrderInboxRecord> {
    const mappingStatus: ExternalOrderMappingStatus = input.items.every(
      (item) =>
        item.mappedProductId !== null && item.modifiers.every((modifier) => modifier.mappedProductId !== null)
    )
      ? 'MAPPED'
      : 'PENDING_MAPPING';

    const row = await this.client.externalOrderInbox.upsert({
      where: {
        tenantId_provider_establishmentExternalId_externalOrderId: {
          tenantId,
          provider: input.provider,
          establishmentExternalId: input.establishmentExternalId,
          externalOrderId: input.externalOrderId
        }
      },
      create: {
        tenantId,
        provider: input.provider,
        establishmentExternalId: input.establishmentExternalId,
        externalOrderId: input.externalOrderId,
        reference: input.reference,
        customerName: input.customerName,
        orderType: input.orderType,
        salesChannel: input.salesChannel,
        currency: input.currency,
        subtotalCents: input.subtotalCents,
        discountCents: input.discountCents,
        deliveryFeeCents: input.deliveryFeeCents,
        totalCents: input.totalCents,
        items: input.items as unknown as Prisma.InputJsonValue,
        status: 'RECEIVED',
        mappingStatus,
        occurredAt: input.occurredAt,
        observedAt: input.observedAt,
        sourceRevision: input.sourceRevision,
        createdAt: input.observedAt,
        updatedAt: input.observedAt
      },
      update: {
        reference: input.reference,
        customerName: input.customerName,
        orderType: input.orderType,
        salesChannel: input.salesChannel,
        subtotalCents: input.subtotalCents,
        discountCents: input.discountCents,
        deliveryFeeCents: input.deliveryFeeCents,
        totalCents: input.totalCents,
        items: input.items as unknown as Prisma.InputJsonValue,
        mappingStatus,
        occurredAt: input.occurredAt,
        observedAt: input.observedAt,
        sourceRevision: input.sourceRevision,
        updatedAt: input.observedAt
      }
    });
    return fromRow(row);
  }

  async list(tenantId: string, filters: ExternalOrderInboxFilters): Promise<ExternalOrderInboxRecord[]> {
    const rows = await this.client.externalOrderInbox.findMany({
      where: {
        tenantId,
        ...(filters.provider ? { provider: filters.provider } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || filters.to
          ? {
              occurredAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lt: filters.to } : {})
              }
            }
          : {})
      },
      orderBy,
      take: filters.limit
    });
    return rows.map(fromRow);
  }

  async find(
    tenantId: string,
    provider: ExternalOrderProvider,
    establishmentExternalId: string,
    externalOrderId: string
  ): Promise<ExternalOrderInboxRecord | undefined> {
    const row = await this.client.externalOrderInbox.findUnique({
      where: {
        tenantId_provider_establishmentExternalId_externalOrderId: {
          tenantId,
          provider,
          establishmentExternalId,
          externalOrderId
        }
      }
    });
    return row ? fromRow(row) : undefined;
  }

  async updateStatus(
    tenantId: string,
    provider: ExternalOrderProvider,
    establishmentExternalId: string,
    externalOrderId: string,
    status: ExternalOrderStatus,
    updatedAt: Date
  ): Promise<ExternalOrderInboxRecord> {
    const row = await this.client.externalOrderInbox.update({
      where: {
        tenantId_provider_establishmentExternalId_externalOrderId: {
          tenantId,
          provider,
          establishmentExternalId,
          externalOrderId
        }
      },
      data: { status, updatedAt }
    });
    return fromRow(row);
  }
}

function fromRow(row: {
  tenantId: string;
  provider: string;
  establishmentExternalId: string;
  externalOrderId: string;
  reference: string;
  customerName: string | null;
  orderType: string;
  salesChannel: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: Prisma.JsonValue;
  status: string;
  mappingStatus: string;
  occurredAt: Date;
  observedAt: Date;
  sourceRevision: string;
  createdAt: Date;
  updatedAt: Date;
}): ExternalOrderInboxRecord {
  return Object.freeze({
    tenantId: row.tenantId,
    provider: row.provider as ExternalOrderProvider,
    establishmentExternalId: row.establishmentExternalId,
    externalOrderId: row.externalOrderId,
    reference: row.reference,
    customerName: row.customerName,
    orderType: row.orderType,
    salesChannel: row.salesChannel,
    currency: row.currency as 'BRL',
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    deliveryFeeCents: row.deliveryFeeCents,
    totalCents: row.totalCents,
    items: row.items as unknown as readonly ExternalOrderInboxItem[],
    status: row.status as ExternalOrderStatus,
    mappingStatus: row.mappingStatus as ExternalOrderMappingStatus,
    occurredAt: row.occurredAt,
    observedAt: row.observedAt,
    sourceRevision: row.sourceRevision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}
