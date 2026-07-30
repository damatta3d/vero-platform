import {
  cancelFinancialEntry,
  createFinancialEntry,
  settleFinancialEntry,
  summarizeCashFlow
} from './finance-model.js';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: 'santo-parma',
  idempotencyKey: 'manual:1',
  description: 'Aluguel',
  category: 'Ocupacao',
  amountCents: 160000,
  dueAt: new Date('2026-08-01T12:00:00Z'),
  authoredBy: 'christian',
  createdAt: new Date('2026-07-30T12:00:00Z')
} as const;

describe('finance domain', () => {
  it('creates, settles and summarizes a payable', () => {
    const open = createFinancialEntry({ ...base, type: 'PAYABLE' });
    const paid = settleFinancialEntry(open, new Date('2026-08-01T10:00:00Z'));
    expect(paid.status).toBe('PAID');
    expect(summarizeCashFlow([paid]).paidCents).toBe(160000);
  });

  it('prevents cancelling a paid entry', () => {
    const paid = settleFinancialEntry(
      createFinancialEntry({ ...base, type: 'PAYABLE' }),
      new Date('2026-08-01T10:00:00Z')
    );
    expect(() => cancelFinancialEntry(paid)).toThrow(
      'Paid financial entries cannot be cancelled'
    );
  });

  it('calculates projected and realized balances', () => {
    const payable = createFinancialEntry({ ...base, type: 'PAYABLE' });
    const receivable = settleFinancialEntry(
      createFinancialEntry({
        ...base,
        id: '22222222-2222-4222-8222-222222222222',
        idempotencyKey: 'sale:1',
        type: 'RECEIVABLE',
        description: 'Vendas do dia',
        amountCents: 250000
      }),
      new Date('2026-08-01T18:00:00Z')
    );
    const summary = summarizeCashFlow([payable, receivable]);
    expect(summary.projectedBalanceCents).toBe(90000);
    expect(summary.realizedBalanceCents).toBe(250000);
  });
});
