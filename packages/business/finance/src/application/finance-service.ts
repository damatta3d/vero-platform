import {
  FinanceEntry,
  type FinanceEntryStatus,
  type FinanceEntryType
} from '../domain/finance-entry.js';
import type { FinanceRepository } from './finance-repository.js';

export interface FinanceAccessContext {
  tenantId: string;
}

export interface CreateFinanceEntryInput {
  type: FinanceEntryType;
  description: string;
  category: string;
  amountInCents: number;
  dueDate: Date;
  counterparty?: string | null;
  sourceKey?: string | null;
}

export interface FinanceSummary {
  receivableOpenInCents: number;
  payableOpenInCents: number;
  receivedInCents: number;
  paidInCents: number;
  projectedBalanceInCents: number;
  realizedBalanceInCents: number;
}

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export class FinanceService {
  constructor(
    private readonly repository: FinanceRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async create(
    context: FinanceAccessContext,
    input: CreateFinanceEntryInput
  ): Promise<FinanceEntry> {
    const sourceKey = input.sourceKey?.trim() || null;
    if (sourceKey) {
      const existing = await this.repository.findBySourceKey(context.tenantId, sourceKey);
      if (existing) return existing;
    }

    const now = this.clock.now();
    const entry = FinanceEntry.create({
      id: this.ids.generate(),
      tenantId: context.tenantId,
      type: input.type,
      description: input.description,
      category: input.category,
      amountInCents: input.amountInCents,
      dueDate: input.dueDate,
      status: 'OPEN',
      counterparty: input.counterparty?.trim() || null,
      sourceKey,
      settledAt: null,
      createdAt: now,
      updatedAt: now
    });
    await this.repository.save(entry);
    return entry;
  }

  async settle(context: FinanceAccessContext, id: string): Promise<FinanceEntry> {
    const entry = await this.requireEntry(context.tenantId, id);
    const settled = entry.settle(this.clock.now());
    await this.repository.save(settled);
    return settled;
  }

  async cancel(context: FinanceAccessContext, id: string): Promise<FinanceEntry> {
    const entry = await this.requireEntry(context.tenantId, id);
    const cancelled = entry.cancel(this.clock.now());
    await this.repository.save(cancelled);
    return cancelled;
  }

  async list(
    context: FinanceAccessContext,
    status?: FinanceEntryStatus
  ): Promise<FinanceEntry[]> {
    return this.repository.list({
      tenantId: context.tenantId,
      ...(status ? { status } : {})
    });
  }

  async summary(context: FinanceAccessContext): Promise<FinanceSummary> {
    const entries = await this.repository.list({ tenantId: context.tenantId });
    const total = (type: FinanceEntryType, status: FinanceEntryStatus) =>
      entries
        .filter((entry) => entry.snapshot.type === type && entry.snapshot.status === status)
        .reduce((sum, entry) => sum + entry.snapshot.amountInCents, 0);

    const receivableOpenInCents = total('RECEIVABLE', 'OPEN');
    const payableOpenInCents = total('PAYABLE', 'OPEN');
    const receivedInCents = total('RECEIVABLE', 'SETTLED');
    const paidInCents = total('PAYABLE', 'SETTLED');

    return {
      receivableOpenInCents,
      payableOpenInCents,
      receivedInCents,
      paidInCents,
      projectedBalanceInCents:
        receivedInCents + receivableOpenInCents - paidInCents - payableOpenInCents,
      realizedBalanceInCents: receivedInCents - paidInCents
    };
  }

  private async requireEntry(tenantId: string, id: string): Promise<FinanceEntry> {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new Error('FINANCE_ENTRY_NOT_FOUND');
    return entry;
  }
}
