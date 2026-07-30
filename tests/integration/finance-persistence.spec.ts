import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

import { createFinancialEntry } from '@vero/business-finance';
import {
  createDatabaseClient,
  PrismaFinanceRepository
} from '@vero/infrastructure-database';

const databaseUrl = process.env.VERO_POSTGRES_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('finance persistence', () => {
  let client: PrismaClient;
  let repository: PrismaFinanceRepository;
  const tenantId = `finance-${randomUUID()}`;

  beforeAll(() => {
    client = createDatabaseClient(databaseUrl!);
    repository = new PrismaFinanceRepository(client);
  });

  afterAll(async () => {
    await client.$executeRawUnsafe(
      'DELETE FROM "financial_entries" WHERE "tenantId" = $1',
      tenantId
    );
    await client.$disconnect();
  });

  it('persists, lists and settles a tenant isolated payable', async () => {
    const entry = createFinancialEntry({
      id: randomUUID(),
      tenantId,
      idempotencyKey: 'rent-2026-08',
      type: 'PAYABLE',
      description: 'Aluguel agosto',
      category: 'Ocupacao',
      amountCents: 160000,
      dueAt: new Date('2026-08-01T12:00:00Z'),
      authoredBy: 'owner',
      createdAt: new Date('2026-07-30T12:00:00Z')
    });

    await repository.create(entry);
    expect(
      await repository.findByIdempotencyKey(tenantId, entry.idempotencyKey)
    ).toMatchObject({
      amountCents: 160000,
      status: 'OPEN'
    });
    expect(await repository.list({ tenantId })).toHaveLength(1);

    await repository.update({
      ...entry,
      status: 'PAID',
      paidAt: new Date('2026-08-01T10:00:00Z')
    });
    expect(await repository.findById(tenantId, entry.id)).toMatchObject({ status: 'PAID' });
    expect(await repository.list({ tenantId: 'another-tenant' })).toHaveLength(0);
  });
});
