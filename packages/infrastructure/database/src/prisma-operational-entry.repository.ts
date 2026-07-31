import { Prisma, type PrismaClient } from '@prisma/client';

type DatabaseClient = InstanceType<typeof PrismaClient>;

export type OperationalEntryType = 'INCOME' | 'EXPENSE' | 'PURCHASE' | 'WITHDRAWAL' | 'ADJUSTMENT';

export type OperationalEntryStatus = 'PAID' | 'PENDING';

export type OperationalEntryChannel = 'IFOOD' | 'ANOTA_AI' | 'PIX' | 'CASH' | 'OTHER';

export interface OperationalEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly type: OperationalEntryType;
  readonly status: OperationalEntryStatus;
  readonly channel: OperationalEntryChannel | null;
  readonly category: string;
  readonly description: string;
  readonly counterparty: string | null;
  readonly paymentMethod: string | null;
  readonly amountCents: number;
  readonly orderCount: number;
  readonly occurredAt: Date;
  readonly competenceDate: Date;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateOperationalEntryInput {
  readonly id: string;
  readonly tenantId: string;
  readonly type: OperationalEntryType;
  readonly status: OperationalEntryStatus;
  readonly channel: OperationalEntryChannel | null;
  readonly category: string;
  readonly description: string;
  readonly counterparty: string | null;
  readonly paymentMethod: string | null;
  readonly amountCents: number;
  readonly orderCount: number;
  readonly occurredAt: Date;
  readonly competenceDate: Date;
  readonly notes: string | null;
  readonly now: Date;
}

export interface OperationalSummary {
  readonly incomeCents: number;
  readonly outflowCents: number;
  readonly pendingCents: number;
  readonly balanceCents: number;
  readonly orderCount: number;
}

export class PrismaOperationalEntryRepository {
  constructor(private readonly client: DatabaseClient) {}

  async create(input: CreateOperationalEntryInput): Promise<OperationalEntry> {
    const rows = await this.client.$queryRaw<OperationalEntry[]>(Prisma.sql`
      INSERT INTO "operational_entries" (
        "id", "tenantId", "type", "status", "channel", "category", "description",
        "counterparty", "paymentMethod", "amountCents", "orderCount", "occurredAt",
        "competenceDate", "notes", "createdAt", "updatedAt"
      ) VALUES (
        ${input.id}::uuid,
        ${input.tenantId},
        ${input.type}::"OperationalEntryType",
        ${input.status}::"OperationalEntryStatus",
        ${input.channel}::"OperationalEntryChannel",
        ${input.category},
        ${input.description},
        ${input.counterparty},
        ${input.paymentMethod},
        ${input.amountCents},
        ${input.orderCount},
        ${input.occurredAt},
        ${input.competenceDate}::date,
        ${input.notes},
        ${input.now},
        ${input.now}
      )
      RETURNING *
    `);

    const created = rows[0];
    if (created === undefined) {
      throw new Error('Operational entry was not created');
    }
    return created;
  }

  list(tenantId: string, from: Date, to: Date, limit: number): Promise<OperationalEntry[]> {
    return this.client.$queryRaw<OperationalEntry[]>(Prisma.sql`
      SELECT *
      FROM "operational_entries"
      WHERE "tenantId" = ${tenantId}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
      ORDER BY "occurredAt" DESC, "createdAt" DESC
      LIMIT ${limit}
    `);
  }

  async summarize(tenantId: string, from: Date, to: Date): Promise<OperationalSummary> {
    const rows = await this.client.$queryRaw<
      Array<{
        incomeCents: number;
        outflowCents: number;
        pendingCents: number;
        orderCount: number;
      }>
    >(Prisma.sql`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN "type" = 'INCOME' AND "status" = 'PAID' THEN "amountCents"
              ELSE 0
            END
          ),
          0
        )::int AS "incomeCents",
        COALESCE(
          SUM(
            CASE
              WHEN "type" IN ('EXPENSE', 'PURCHASE', 'WITHDRAWAL')
                AND "status" = 'PAID'
                THEN "amountCents"
              ELSE 0
            END
          ),
          0
        )::int AS "outflowCents",
        COALESCE(
          SUM(CASE WHEN "status" = 'PENDING' THEN "amountCents" ELSE 0 END),
          0
        )::int AS "pendingCents",
        COALESCE(SUM("orderCount"), 0)::int AS "orderCount"
      FROM "operational_entries"
      WHERE "tenantId" = ${tenantId}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
    `);

    const summary = rows[0] ?? {
      incomeCents: 0,
      outflowCents: 0,
      pendingCents: 0,
      orderCount: 0
    };

    return {
      ...summary,
      balanceCents: summary.incomeCents - summary.outflowCents
    };
  }
}
