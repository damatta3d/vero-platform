import {
  cancelFinancialEntry,
  createFinancialEntry,
  settleFinancialEntry,
  summarizeCashFlow,
  type CashFlowSummary,
  type CreateFinancialEntryInput,
  type FinancialEntry
} from '../domain/finance-model.js';
import type { FinanceRepository, FinancialEntryFilter } from './finance-repository.js';

export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  async create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    const existing = await this.repository.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) return existing;
    return this.repository.create(createFinancialEntry(input));
  }

  async settle(tenantId: string, id: string, paidAt: Date): Promise<FinancialEntry> {
    const entry = await this.getRequired(tenantId, id);
    return this.repository.update(settleFinancialEntry(entry, paidAt));
  }

  async cancel(tenantId: string, id: string): Promise<FinancialEntry> {
    const entry = await this.getRequired(tenantId, id);
    return this.repository.update(cancelFinancialEntry(entry));
  }

  list(filter: FinancialEntryFilter): Promise<readonly FinancialEntry[]> {
    return this.repository.list(filter);
  }

  async summary(filter: FinancialEntryFilter, asOf = new Date()): Promise<CashFlowSummary> {
    return summarizeCashFlow(await this.repository.list(filter), asOf);
  }

  private async getRequired(tenantId: string, id: string): Promise<FinancialEntry> {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new Error('Financial entry not found');
    return entry;
  }
}
