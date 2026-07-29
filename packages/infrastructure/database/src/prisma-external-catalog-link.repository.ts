import { type Prisma, type PrismaClient } from '@prisma/client';

import {
  ExternalCatalogLinkError,
  type ExternalCatalogLink,
  type ExternalCatalogLinkAudit,
  type ExternalCatalogLinkRepository,
  type ExternalCatalogReferenceKind,
  type PersistedExternalCatalogLink
} from '@vero/business-sales';

type DatabaseClient = InstanceType<typeof PrismaClient>;
type TransactionClient = Prisma.TransactionClient;

function fromRow(row: {
  tenantId: string;
  provider: string;
  establishmentExternalId: string;
  kind: string;
  providerItemId: string;
  catalogProductId: string;
  authoredBy: string;
  createdAt: Date;
  updatedAt: Date;
}): PersistedExternalCatalogLink {
  return Object.freeze({
    ...row,
    kind: row.kind as ExternalCatalogReferenceKind
  });
}

async function requireCatalogProduct(
  transaction: TransactionClient,
  tenantId: string,
  catalogProductId: string
): Promise<void> {
  const product = await transaction.catalogProduct.findUnique({
    where: { tenantId_id: { tenantId, id: catalogProductId } },
    select: { id: true }
  });
  if (!product) {
    throw new ExternalCatalogLinkError('CATALOG_PRODUCT_NOT_FOUND', 'catalogProductId');
  }
}

export class PrismaExternalCatalogLinkRepository implements ExternalCatalogLinkRepository {
  constructor(private readonly client: DatabaseClient) {}

  async upsert(
    link: ExternalCatalogLink,
    audit: ExternalCatalogLinkAudit
  ): Promise<PersistedExternalCatalogLink> {
    return this.client.$transaction(async (transaction) => {
      await requireCatalogProduct(transaction, link.tenantId, link.catalogProductId);
      const row = await transaction.externalCatalogLink.upsert({
        where: {
          tenantId_provider_establishmentExternalId_kind_providerItemId: {
            tenantId: link.tenantId,
            provider: link.provider,
            establishmentExternalId: link.establishmentExternalId,
            kind: link.kind,
            providerItemId: link.providerItemId
          }
        },
        create: {
          ...link,
          authoredBy: audit.authoredBy,
          createdAt: audit.at,
          updatedAt: audit.at
        },
        update: {
          catalogProductId: link.catalogProductId,
          authoredBy: audit.authoredBy,
          updatedAt: audit.at
        }
      });
      return fromRow(row);
    });
  }

  async remove(link: ExternalCatalogLink): Promise<boolean> {
    const result = await this.client.externalCatalogLink.deleteMany({
      where: {
        tenantId: link.tenantId,
        provider: link.provider,
        establishmentExternalId: link.establishmentExternalId,
        kind: link.kind,
        providerItemId: link.providerItemId
      }
    });
    return result.count === 1;
  }

  async list(
    tenantId: string,
    provider: string,
    establishmentExternalId: string
  ): Promise<readonly PersistedExternalCatalogLink[]> {
    const rows = await this.client.externalCatalogLink.findMany({
      where: { tenantId, provider, establishmentExternalId },
      orderBy: [{ kind: 'asc' }, { providerItemId: 'asc' }]
    });
    return Object.freeze(rows.map(fromRow));
  }
}
