import { FinanceEntry } from '../domain/finance-entry.js';
import type { FinanceEntryFilter, FinanceRepository } from './finance-repository.js';
import { FinanceService } from './finance-service.js';

class MemoryFinanceRepository implements FinanceRepository {
  private readonly entries = new Map<string, FinanceEntry>();

  async save(entry: FinanceEntry): Promise<void> {
    this.entries.set(`${entry.snapshot.tenantId}:${entry.snapshot.id}`, entry);
  }

  async findById(tenantId: string, id: string): Promise<FinanceEntry | null> {
    return this.entries.get(`${tenantId}:${id}`) ?? null;
  }

  async findBySourceKey(tenantId: string, sourceKey: string): Promise<FinanceEntry | null> {
    return (
      [...this.entries.values()].find(
        (entry) => entry.snapshot.tenantId === tenantId && entry.snapshot.sourceKey === sourceKey
      ) ?? null
    );
  }

  async list(filter: FinanceEntryFilter): Promise<FinanceEntry[]> {
    return [...this.entries.values()].filter((entry) => {
      const snapshot = entry.snapshot;
      return (
        snapshot.tenantId === filter.tenantId &&
        (!filter.type || snapshot.type === filter.type) &&
        (!filter.status || snapshot.status === filter.status)
      );
    });
  }
}

describe('FinanceService', () => {
  const now = new Date('2026-08-01T12:00:00.000Z');

  it('creates idempotent entries by tenant and source key', async () => {
    const repository = new MemoryFinanceRepository();
    let sequence = 0;
    const service = new FinanceService(
      repository,
      { generate: () => `id-${++sequence}` },
      { now: () => now }
    );

    const input = {
      type: 'RECEIVABLE' as const,
      description: 'Venda iFood',
      category: 'Vendas',
      amountInCents: 12500,
      dueDate: now,
      sourceKey: 'ifood:pedido-1'
    };

    const first = await service.create({ tenantId: 'santo-parma' }, input);
    const duplicate = await service.create({ tenantId: 'santo-parma' }, input);
    const otherTenant = await service.create({ tenantId: 'outra-empresa' }, input);

    expect(duplicate.snapshot.id).toBe(first.snapshot.id);
    expect(otherTenant.snapshot.id).not.toBe(first.snapshot.id);
  });

  it('calculates projected and realized balances', async () => {
    const repository = new MemoryFinanceRepository();
    let sequence = 0;
    const service = new FinanceService(
      repository,
      { generate: () => `id-${++sequence}` },
      { now: () => now }
    );
    const context = { tenantId: 'santo-parma' };

    const receivable = await service.create(context, {
      type: 'RECEIVABLE',
      description: 'Receita',
      category: 'Vendas',
      amountInCents: 20000,
      dueDate: now
    });
    await service.create(context, {
      type: 'PAYABLE',
      description: 'Compra',
      category: 'Insumos',
      amountInCents: 7000,
      dueDate: now
    });
    await service.settle(context, receivable.snapshot.id);

    await expect(service.summary(context)).resolves.toEqual({
      receivableOpenInCents: 0,
      payableOpenInCents: 7000,
      receivedInCents: 20000,
      paidInCents: 0,
      projectedBalanceInCents: 13000,
      realizedBalanceInCents: 20000
    });
  });
});
