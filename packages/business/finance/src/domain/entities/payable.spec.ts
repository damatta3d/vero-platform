import { Payable } from './payable.js';
import { AccountCode } from '../value-objects/account-code.js';
import { Competency } from '../value-objects/competency.js';
import { DocumentNumber } from '../value-objects/document-number.js';
import { DueDate } from '../value-objects/due-date.js';
import { Money } from '../value-objects/money.js';
import { PayableStatus } from '../enums/payable-status.js';

describe('Payable', () => {
  const createPayable = () =>
    Payable.create({
      id: 'payable-1',
      accountCode: AccountCode.create('1.1.01'),
      description: 'Fornecedor de Alimentos',
      supplier: 'Fornecedor XYZ',
      amount: Money.fromDecimal(250.75),
      competency: Competency.from('2026-07'),
      dueDate: DueDate.from('2026-08-10'),
      documentNumber: DocumentNumber.from('NF-000123'),
    });

  it('creates a payable', () => {
    const payable = createPayable();

    expect(payable.id).toBe('payable-1');
    expect(payable.description).toBe('Fornecedor de Alimentos');
    expect(payable.supplier).toBe('Fornecedor XYZ');
  });

  it('starts with pending status', () => {
    const payable = createPayable();

    expect(payable.getStatus()).toBe(PayableStatus.PENDING);
  });

  it('starts without installments', () => {
    const payable = createPayable();

    expect(payable.getInstallments()).toHaveLength(0);
  });

  it('starts without payments', () => {
    const payable = createPayable();

    expect(payable.getPayments()).toHaveLength(0);
  });

  it('requires description', () => {
    expect(() =>
      Payable.create({
        id: '1',
        accountCode: AccountCode.create('1.1.01'),
        description: '',
        supplier: 'Fornecedor',
        amount: Money.fromDecimal(10),
        competency: Competency.from('2026-07'),
        dueDate: DueDate.from('2026-08-01'),
        documentNumber: DocumentNumber.from('NF-1'),
      })
    ).toThrow('Description is required.');
  });

  it('requires supplier', () => {
    expect(() =>
      Payable.create({
        id: '1',
        accountCode: AccountCode.create('1.1.01'),
        description: 'Compra',
        supplier: '',
        amount: Money.fromDecimal(10),
        competency: Competency.from('2026-07'),
        dueDate: DueDate.from('2026-08-01'),
        documentNumber: DocumentNumber.from('NF-1'),
      })
    ).toThrow('Supplier is required.');
  });
});