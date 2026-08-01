export const FINANCE_ENTRY_TYPES = ['RECEIVABLE', 'PAYABLE'] as const;
export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];

export const FINANCE_ENTRY_STATUSES = ['OPEN', 'SETTLED', 'CANCELLED'] as const;
export type FinanceEntryStatus = (typeof FINANCE_ENTRY_STATUSES)[number];

export interface FinanceEntryProps {
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
}

export class FinanceEntry {
  private constructor(private readonly props: FinanceEntryProps) {}

  static create(props: FinanceEntryProps): FinanceEntry {
    if (!props.id.trim() || !props.tenantId.trim()) throw new Error('FINANCE_IDENTITY_REQUIRED');
    if (!props.description.trim()) throw new Error('FINANCE_DESCRIPTION_REQUIRED');
    if (!props.category.trim()) throw new Error('FINANCE_CATEGORY_REQUIRED');
    if (!Number.isSafeInteger(props.amountInCents) || props.amountInCents <= 0) {
      throw new Error('FINANCE_AMOUNT_INVALID');
    }
    if (Number.isNaN(props.dueDate.getTime())) throw new Error('FINANCE_DUE_DATE_INVALID');
    if (props.status === 'SETTLED' && props.settledAt === null) {
      throw new Error('FINANCE_SETTLEMENT_DATE_REQUIRED');
    }
    return new FinanceEntry({ ...props });
  }

  get snapshot(): Readonly<FinanceEntryProps> {
    return { ...this.props };
  }

  settle(at: Date): FinanceEntry {
    if (this.props.status !== 'OPEN') throw new Error('FINANCE_ENTRY_NOT_OPEN');
    return FinanceEntry.create({ ...this.props, status: 'SETTLED', settledAt: at, updatedAt: at });
  }

  cancel(at: Date): FinanceEntry {
    if (this.props.status !== 'OPEN') throw new Error('FINANCE_ENTRY_NOT_OPEN');
    return FinanceEntry.create({ ...this.props, status: 'CANCELLED', updatedAt: at });
  }
}
