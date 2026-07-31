import { Prisma, type PrismaClient } from '@prisma/client';

import {
  AccountCode,
  type Account,
  type AccountFilter,
  type AccountGroupType,
  type AccountRepository
} from '@vero/business-finance';

type DatabaseClient = InstanceType<typeof PrismaClient>;

interface FinanceAccountRow {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly group: AccountGroupType;
  readonly parentId: string | null;
  readonly acceptsPosting: boolean;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function fromRow(row: FinanceAccountRow): Account {
  return Object.freeze({
    id: row.id,
    tenantId: row.tenantId,
    code: AccountCode.create(row.code),
    name: row.name,
    group: row.group,
    parentId: row.parentId,
    acceptsPosting: row.acceptsPosting,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

const selectColumns = Prisma.sql`
  "id",
  "tenantId",
  "code",
  "name",
  "group",
  "parentId",
  "acceptsPosting",
  "active",
  "createdAt",
  "updatedAt"
`;

export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly client: DatabaseClient) {}

  async create(account: Account): Promise<Account> {
    const rows = await this.client.$queryRaw<FinanceAccountRow[]>(Prisma.sql`
      INSERT INTO "finance_accounts" (
        "id",
        "tenantId",
        "code",
        "name",
        "group",
        "parentId",
        "acceptsPosting",
        "active",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${account.id}::uuid,
        ${account.tenantId},
        ${account.code.toString()},
        ${account.name},
        ${account.group}::"FinanceAccountGroupType",
        ${account.parentId}::uuid,
        ${account.acceptsPosting},
        ${account.active},
        ${account.createdAt},
        ${account.updatedAt}
      )
      RETURNING ${selectColumns}
    `);

    const row = rows[0];

    if (!row) {
      throw new Error('Finance account was not created');
    }

    return fromRow(row);
  }

  async update(account: Account): Promise<Account> {
    const rows = await this.client.$queryRaw<FinanceAccountRow[]>(Prisma.sql`
      UPDATE "finance_accounts"
      SET
        "code" = ${account.code.toString()},
        "name" = ${account.name},
        "group" = ${account.group}::"FinanceAccountGroupType",
        "parentId" = ${account.parentId}::uuid,
        "acceptsPosting" = ${account.acceptsPosting},
        "active" = ${account.active},
        "updatedAt" = ${account.updatedAt}
      WHERE
        "tenantId" = ${account.tenantId}
        AND "id" = ${account.id}::uuid
      RETURNING ${selectColumns}
    `);

    const row = rows[0];

    if (!row) {
      throw new Error('Finance account was not updated');
    }

    return fromRow(row);
  }

  async findById(tenantId: string, id: string): Promise<Account | null> {
    const rows = await this.client.$queryRaw<FinanceAccountRow[]>(Prisma.sql`
      SELECT ${selectColumns}
      FROM "finance_accounts"
      WHERE
        "tenantId" = ${tenantId}
        AND "id" = ${id}::uuid
      LIMIT 1
    `);

    return rows[0] ? fromRow(rows[0]) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Account | null> {
    const rows = await this.client.$queryRaw<FinanceAccountRow[]>(Prisma.sql`
      SELECT ${selectColumns}
      FROM "finance_accounts"
      WHERE
        "tenantId" = ${tenantId}
        AND "code" = ${code}
      LIMIT 1
    `);

    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(filter: AccountFilter): Promise<readonly Account[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"tenantId" = ${filter.tenantId}`];

    if (filter.active !== undefined) {
      conditions.push(Prisma.sql`"active" = ${filter.active}`);
    }

    if (filter.group !== undefined) {
      conditions.push(Prisma.sql`"group" = ${filter.group}::"FinanceAccountGroupType"`);
    }

    if (filter.parentId !== undefined) {
      conditions.push(
        filter.parentId === null
          ? Prisma.sql`"parentId" IS NULL`
          : Prisma.sql`"parentId" = ${filter.parentId}::uuid`
      );
    }

    const rows = await this.client.$queryRaw<FinanceAccountRow[]>(Prisma.sql`
      SELECT ${selectColumns}
      FROM "finance_accounts"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "code" ASC
      LIMIT 1000
    `);

    return rows.map(fromRow);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.client.$executeRaw(Prisma.sql`
      DELETE FROM "finance_accounts"
      WHERE
        "tenantId" = ${tenantId}
        AND "id" = ${id}::uuid
    `);
  }
}
