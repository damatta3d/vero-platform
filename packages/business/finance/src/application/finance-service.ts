import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import {
  cancelFinancialEntry,
  createFinancialEntry,
  settleFinancialEntry,
  summarizeCashFlow,
  type CashFlowSummary,
  type FinancialEntry,
  type FinancialEntryStatus,
  type FinancialEntryType
} from '../domain/finance-model.js';
import type { FinanceRepository, FinancialEntryFilter } from './finance-repository.js';

export interface FinanceIdGenerator {
  generate(): string;
}

export interface FinanceClock {
  now(): Date;
}

export interface RecordFinancialEntryInput {
  readonly idempotencyKey: string;
  readonly type: FinancialEntryType;
  readonly description: string;
  readonly category: string;
  readonly counterparty?: string | null;
  readonly amountCents: number;
  readonly dueAt: Date;
  readonly sourceType?: string | null;
  readonly sourceId?: string | null;
}

export interface ListFinancialEntriesInput {
  readonly type?: FinancialEntryType;
  readonly status?: FinancialEntryStatus;
  readonly from?: Date;
  readonly to?: Date;
}

function financeAuthorization(
  context: AuthorizedAccessContext,
  expectedAction: string
): { tenantId: string; authoredBy: string } {
  const authorized = consumeAuthorizedAccess(context);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'finance.management'
  ) {
    throw new Error('Finance authorization denied');
  }
  return {
    tenantId: authorized.request.tenant.tenantId.toString(),
    authoredBy: authorized.request.identity.principal.id.toString()
  };
}

export class FinanceService {
  constructor(
    private readonly repository: FinanceRepository,
    private readonly ids: FinanceIdGenerator,
    private readonly clock: FinanceClock
  ) {}

  async create(
    access: AuthorizedAccessContext,
    input: RecordFinancialEntryInput
  ): Promise<FinancialEntry> {
    const { tenantId, authoredBy } = financeAuthorization(access, 'finance.create');
    const existing = await this.repository.findByIdempotencyKey(tenantId, input.idempotencyKey);
    if (existing) return existing;
    return this.repository.create(
      createFinancialEntry({
        ...input,
        id: this.ids.generate(),
        tenantId,
        authoredBy,
        createdAt: this.clock.now()
      })
    );
  }

  async settle(
    access: AuthorizedAccessContext,
    id: string,
    paidAt?: Date
  ): Promise<FinancialEntry> {
    const { tenantId } = financeAuthorization(access, 'finance.update');
    const entry = await this.getRequired(tenantId, id);
    return this.repository.update(settleFinancialEntry(entry, paidAt ?? this.clock.now()));
  }

  async cancel(access: AuthorizedAccessContext, id: string): Promise<FinancialEntry> {
    const { tenantId } = financeAuthorization(access, 'finance.update');
    const entry = await this.getRequired(tenantId, id);
    return this.repository.update(cancelFinancialEntry(entry));
  }

  list(
    access: AuthorizedAccessContext,
    input: ListFinancialEntriesInput = {}
  ): Promise<readonly FinancialEntry[]> {
    const { tenantId } = financeAuthorization(access, 'finance.read');
    return this.repository.list({ tenantId, ...input });
  }

  async summary(
    access: AuthorizedAccessContext,
    input: ListFinancialEntriesInput = {}
  ): Promise<CashFlowSummary> {
    const { tenantId } = financeAuthorization(access, 'finance.read');
    const filter: FinancialEntryFilter = { tenantId, ...input };
    return summarizeCashFlow(await this.repository.list(filter), this.clock.now());
  }

  private async getRequired(tenantId: string, id: string): Promise<FinancialEntry> {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new Error('Financial entry not found');
    return entry;
  }
}
