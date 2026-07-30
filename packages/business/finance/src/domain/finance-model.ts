export type FinancialEntryType = 'RECEIVABLE' | 'PAYABLE';
export type FinancialEntryStatus = 'OPEN' | 'PAID' | 'CANCELLED';

export interface FinancialEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly type: FinancialEntryType;
  readonly description: string;
  readonly category: string;
  readonly counterparty: string | null;
  readonly amountCents: number;
  readonly dueAt: Date;
  readonly paidAt: Date | null;
  readonly status: FinancialEntryStatus;
  readonly sourceType: string | null;
  readonly sourceId: string | null;
  readonly authoredBy: string;
  readonly createdAt: Date;
}

export interface CreateFinancialEntryInput {
  readonly id: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly type: FinancialEntryType;
  readonly description: string;
  readonly category: string;
  readonly counterparty?: string | null;
  readonly amountCents: number;
  readonly dueAt: Date;
  readonly sourceType?: string | null;
  readonly sourceId?: string | null;
  readonly authoredBy: string;
  readonly createdAt: Date;
}

export interface CashFlowSummary {
  readonly receivableCents: number;
  readonly payableCents: number;
  readonly receivedCents: number;
  readonly paidCents: number;
  readonly projectedBalanceCents: number;
  readonly realizedBalanceCents: number;
  readonly overduePayableCents: number;
  readonly overdueReceivableCents: number;
}

function requiredText(value: string, field: string, max = 256): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new Error(`Invalid financial field: ${field}`);
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  field: string,
  max = 256
): string | null {
  if (value == null) return null;
  return requiredText(value, field, max);
}

function validDate(value: Date, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid financial field: ${field}`);
  }
  return date;
}

export function createFinancialEntry(input: CreateFinancialEntryInput): FinancialEntry {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Invalid financial field: amountCents');
  }
  if (input.type !== 'PAYABLE' && input.type !== 'RECEIVABLE') {
    throw new Error('Invalid financial field: type');
  }

  return Object.freeze({
    id: requiredText(input.id, 'id', 160),
    tenantId: requiredText(input.tenantId, 'tenantId', 128),
    idempotencyKey: requiredText(input.idempotencyKey, 'idempotencyKey', 160),
    type: input.type,
    description: requiredText(input.description, 'description'),
    category: requiredText(input.category, 'category', 120),
    counterparty: optionalText(input.counterparty, 'counterparty'),
    amountCents: input.amountCents,
    dueAt: validDate(input.dueAt, 'dueAt'),
    paidAt: null,
    status: 'OPEN',
    sourceType: optionalText(input.sourceType, 'sourceType', 64),
    sourceId: optionalText(input.sourceId, 'sourceId', 160),
    authoredBy: requiredText(input.authoredBy, 'authoredBy'),
    createdAt: validDate(input.createdAt, 'createdAt')
  });
}

export function settleFinancialEntry(
  entry: FinancialEntry,
  paidAt: Date
): FinancialEntry {
  if (entry.status !== 'OPEN') {
    throw new Error('Only open financial entries can be settled');
  }
  return Object.freeze({
    ...entry,
    status: 'PAID',
    paidAt: validDate(paidAt, 'paidAt')
  });
}

export function cancelFinancialEntry(entry: FinancialEntry): FinancialEntry {
  if (entry.status === 'PAID') {
    throw new Error('Paid financial entries cannot be cancelled');
  }
  return Object.freeze({ ...entry, status: 'CANCELLED' });
}

export function summarizeCashFlow(
  entries: readonly FinancialEntry[],
  asOf = new Date()
): CashFlowSummary {
  const active = entries.filter((entry) => entry.status !== 'CANCELLED');
  const receivableCents = active
    .filter((entry) => entry.type === 'RECEIVABLE')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const payableCents = active
    .filter((entry) => entry.type === 'PAYABLE')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const receivedCents = active
    .filter((entry) => entry.type === 'RECEIVABLE' && entry.status === 'PAID')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const paidCents = active
    .filter((entry) => entry.type === 'PAYABLE' && entry.status === 'PAID')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const overduePayableCents = active
    .filter(
      (entry) => entry.type === 'PAYABLE' && entry.status === 'OPEN' && entry.dueAt < asOf
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const overdueReceivableCents = active
    .filter(
      (entry) => entry.type === 'RECEIVABLE' && entry.status === 'OPEN' && entry.dueAt < asOf
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  return Object.freeze({
    receivableCents,
    payableCents,
    receivedCents,
    paidCents,
    projectedBalanceCents: receivableCents - payableCents,
    realizedBalanceCents: receivedCents - paidCents,
    overduePayableCents,
    overdueReceivableCents
  });
}
