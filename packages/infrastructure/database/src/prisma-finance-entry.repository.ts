import { Prisma, type PrismaClient } from '@prisma/client';
import {
  FinanceEntry,
  type FinanceEntryFilter,
  type FinanceEntryStatus,
  type FinanceEntryType,
  type FinanceRepository
} from '@vero/business-finance';

type DatabaseClient = InstanceType<typeof PrismaClient>;

type FinanceEntryRow = {
  id: string;
  tenantId: string;
  type: FinanceEntryType;
  description: string;
  category: string;
  amountInCents: number;
  dueDate: Date;
  status: FinanceEntryStatus;
  counterparty: string | null;
  sourceKey: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function hydrate(row: FinanceEntryRow): FinanceEntry {
  return FinanceEntry.create(row);
}

export class PrismaFinanceEntryRepository implements FinanceRepository {
  constructor(private readonly client: DatabaseClient) {}

  async save(entry: FinanceEntry): Promise<void> {
    const snapshot = entry.snapshot;
    await this.client.$executeRaw(Prisma.sql`
      INSERT INTO "finance_entries" (
        "id", "tenantId", "type", "description", "category", "amountInCents",
        "dueDate", "status", "counterparty", "sourceKey", "settledAt", "createdAt", "updatedAt"
      ) VALUES (
        ${snapshot.id}::uuid, ${snapshot.tenantId}, ${snapshot.type}::"FinanceEntryType",
        ${snapshot.description}, ${snapshot.category}, ${snapshot.amountInCents}, ${snapshot.dueDate},
        ${snapshot.status}::"FinanceEntryStatus", ${snapshot.counterparty}, ${snapshot.sourceKey},
        ${snapshot.settledAt}, ${snapshot.createdAt}, ${snapshot.updatedAt}
      )
      ON CONFLICT ("tenantId", "id") DO UPDATE SET
        "type" = EXCLUDED."type",
        "description" = EXCLUDED."description",
        "category" = EXCLUDED."category",
        "amountInCents" = EXCLUDED."amountInCents",
        "dueDate" = EXCLUDED."dueDate",
        "status" = EXCLUDED."status",
        "counterparty" = EXCLUDED."counterparty",
        "sourceKey" = EXCLUDED."sourceKey",
        "settledAt" = EXCLUDED."settledAt",
        "updatedAt" = EXCLUDED."updatedAt"
    `);
  }

  async findById(tenantId: string, id: string): Promise<FinanceEntry | null> {
    const rows = await this.client.$queryRaw<FinanceEntryRow[]>(Prisma.sql`
      SELECT * FROM "finance_entries"
      WHERE "tenantId" = ${tenantId} AND "id" = ${id}::uuid
      LIMIT 1
    `);
    return rows[0] ? hydrate(rows[0]) : null;
  }

  async findBySourceKey(tenantId: string, sourceKey: string): Promise<FinanceEntry | null> {
    const rows = await this.client.$queryRaw<FinanceEntryRow[]>(Prisma.sql`
      SELECT * FROM "finance_entries"
      WHERE "tenantId" = ${tenantId} AND "sourceKey" = ${sourceKey}
      LIMIT 1
    `);
    return rows[0] ? hydrate(rows[0]) : null;
  }

  async list(filter: FinanceEntryFilter): Promise<FinanceEntry[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"tenantId" = ${filter.tenantId}`];
    if (filter.type) conditions.push(Prisma.sql`"type" = ${filter.type}::"FinanceEntryType"`);
    if (filter.status) {
      conditions.push(Prisma.sql`"status" = ${filter.status}::"FinanceEntryStatus"`);
    }
    if (filter.dueFrom) conditions.push(Prisma.sql`"dueDate" >= ${filter.dueFrom}`);
    if (filter.dueTo) conditions.push(Prisma.sql`"dueDate" <= ${filter.dueTo}`);

    const rows = await this.client.$queryRaw<FinanceEntryRow[]>(Prisma.sql`
      SELECT * FROM "finance_entries"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "dueDate" ASC, "createdAt" DESC
      LIMIT 500
    `);
    return rows.map(hydrate);
  }
}
