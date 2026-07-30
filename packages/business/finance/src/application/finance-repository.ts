import type {
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType
} from '../domain/finance-model.js';

export interface FinancialEntryFilter {
  readonly tenantId: string;
  readonly type?: FinancialEntryType;
  readonly status?: FinancialEntryStatus;
  readonly from?: Date;
  readonly to?: Date;
}

export interface FinanceRepository {
  create(entry: FinancialEntry): Promise<FinancialEntry>;
  findById(tenantId: string, id: string): Promise<FinancialEntry | null>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<FinancialEntry | null>;
  list(filter: FinancialEntryFilter): Promise<readonly FinancialEntry[]>;
  update(entry: FinancialEntry): Promise<FinancialEntry>;
}
