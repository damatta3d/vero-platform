import type {
  FinanceEntry,
  FinanceEntryStatus,
  FinanceEntryType
} from '../domain/finance-entry.js';

export interface FinanceEntryFilter {
  tenantId: string;
  type?: FinanceEntryType;
  status?: FinanceEntryStatus;
  dueFrom?: Date;
  dueTo?: Date;
}

export interface FinanceRepository {
  save(entry: FinanceEntry): Promise<void>;
  findById(tenantId: string, id: string): Promise<FinanceEntry | null>;
  findBySourceKey(tenantId: string, sourceKey: string): Promise<FinanceEntry | null>;
  list(filter: FinanceEntryFilter): Promise<FinanceEntry[]>;
}
