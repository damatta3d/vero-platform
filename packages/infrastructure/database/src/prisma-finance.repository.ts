import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  FinanceRepository,
  FinancialEntry,
  FinancialEntryFilter,
  FinancialEntryStatus,
  FinancialEntryType
} from '@vero/business-finance';

type FinancePrismaClient = InstanceType<typeof PrismaClient>;

type FinancialEntryRow = {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  type: FinancialEntryType;
  description: string;
  category: string;
  counterparty: string | null;
  amountCents: number;
  dueAt: Date;
  paidAt: Date | null;
  status: FinancialEntryStatus;
  sourceType: string | null;
  sourceId: string | null;
  authoredBy: string;
  createdAt: Date;
};

function fromRow(row: FinancialEntryRow): FinancialEntry {
  return Object.freeze({ ...row });
}

export class PrismaFinanceRepository implements FinanceRepository {
  constructor(private readonly client: FinancePrismaClient) {}

  async create(entry: FinancialEntry): Promise<FinancialEntry> {
    const rows = await this.client.$queryRaw<FinancialEntryRow[]>(Prisma.sql`
      INSERT INTO "financial_entries" (
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt", "updatedAt"
      ) VALUES (
        ${entry.id}::uuid, ${entry.tenantId}, ${entry.idempotencyKey},
        ${entry.type}::"FinancialEntryType", ${entry.description}, ${entry.category},
        ${entry.counterparty}, ${entry.amountCents}, ${entry.dueAt}, ${entry.paidAt},
        ${entry.status}::"FinancialEntryStatus", ${entry.sourceType}, ${entry.sourceId},
        ${entry.authoredBy}, ${entry.createdAt}, ${entry.createdAt}
      )
      RETURNING
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt"
    `);
    const row = rows[0];
    if (!row) throw new Error('Financial entry was not created');
    return fromRow(row);
  }

  async findById(tenantId: string, id: string): Promise<FinancialEntry | null> {
    const rows = await this.client.$queryRaw<FinancialEntryRow[]>(Prisma.sql`
      SELECT
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt"
      FROM "financial_entries"
      WHERE "tenantId" = ${tenantId} AND "id" = ${id}::uuid
      LIMIT 1
    `);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<FinancialEntry | null> {
    const rows = await this.client.$queryRaw<FinancialEntryRow[]>(Prisma.sql`
      SELECT
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt"
      FROM "financial_entries"
      WHERE "tenantId" = ${tenantId} AND "idempotencyKey" = ${idempotencyKey}
      LIMIT 1
    `);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(filter: FinancialEntryFilter): Promise<readonly FinancialEntry[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"tenantId" = ${filter.tenantId}`];
    if (filter.type) conditions.push(Prisma.sql`"type" = ${filter.type}::"FinancialEntryType"`);
    if (filter.status) {
      conditions.push(Prisma.sql`"status" = ${filter.status}::"FinancialEntryStatus"`);
    }
    if (filter.from) conditions.push(Prisma.sql`"dueAt" >= ${filter.from}`);
    if (filter.to) conditions.push(Prisma.sql`"dueAt" <= ${filter.to}`);

    const rows = await this.client.$queryRaw<FinancialEntryRow[]>(Prisma.sql`
      SELECT
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt"
      FROM "financial_entries"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "dueAt" ASC, "createdAt" DESC
      LIMIT 500
    `);
    return rows.map(fromRow);
  }

  async update(entry: FinancialEntry): Promise<FinancialEntry> {
    const rows = await this.client.$queryRaw<FinancialEntryRow[]>(Prisma.sql`
      UPDATE "financial_entries"
      SET
        "paidAt" = ${entry.paidAt},
        "status" = ${entry.status}::"FinancialEntryStatus",
        "updatedAt" = NOW()
      WHERE "tenantId" = ${entry.tenantId} AND "id" = ${entry.id}::uuid
      RETURNING
        "id", "tenantId", "idempotencyKey", "type", "description", "category",
        "counterparty", "amountCents", "dueAt", "paidAt", "status", "sourceType",
        "sourceId", "authoredBy", "createdAt"
    `);
    const row = rows[0];
    if (!row) throw new Error('Financial entry was not updated');
    return fromRow(row);
  }
}
