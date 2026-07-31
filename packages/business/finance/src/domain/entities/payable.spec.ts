import { DomainValidationError } from '@vero/core-domain';

import { PayableStatus } from '../enums/payable-status.js';
import { AccountCode } from '../value-objects/account-code.js';
import { Competency } from '../value-objects/competency.js';
import { DocumentNumber } from '../value-objects/document-number.js';
import { DueDate } from '../value-objects/due-date.js';
import { Money } from '../value-objects/money.js';
import { Payable } from './payable.js';

describe('Payable', () => {
  const createPayable = () =>
    Payable.create({
      id: '44c756a9-f689-4bca-a9d4-8ba31f606ca9',
      accountCode: AccountCode.create('1.1.01'),
      description: 'Fornecedor de Alimentos',
      supplier: 'Fornecedor XYZ',
      amount: Money.fromDecimal(250.75),
      competency: Competency.from('2026-07'),
      dueDate: DueDate.from('2026-08-10'),
      documentNumber: DocumentNumber.from('NF-000123')
    });

  it('creates an aggregate with a unique entity id', () => {
    const payable = createPayable();

    expect(payable.id.toString()).toBe('44c756a9-f689-4bca-a9d4-8ba31f606ca9');
    expect(payable.description).toBe('Fornecedor de Alimentos');
    expect(payable.supplier).toBe('Fornecedor XYZ');
  });

  it('starts with pending status and no child records', () => {
    const payable = createPayable();

    expect(payable.getStatus()).toBe(PayableStatus.PENDING);
    expect(payable.getInstallments()).toHaveLength(0);
    expect(payable.getPayments()).toHaveLength(0);
    expect(payable.domainEvents).toHaveLength(0);
  });

  it.each([
    {
      field: 'description',
      description: '',
      supplier: 'Fornecedor',
      message: 'Description is required.'
    },
    {
      field: 'supplier',
      description: 'Compra',
      supplier: '',
      message: 'Supplier is required.'
    }
  ])('requires $field', ({ description, supplier, message }) => {
    expect(() =>
      Payable.create({
        id: '44c756a9-f689-4bca-a9d4-8ba31f606ca9',
        accountCode: AccountCode.create('1.1.01'),
        description,
        supplier,
        amount: Money.fromDecimal(10),
        competency: Competency.from('2026-07'),
        dueDate: DueDate.from('2026-08-01'),
        documentNumber: DocumentNumber.from('NF-1')
      })
    ).toThrow(message);

    try {
      Payable.create({
        id: '44c756a9-f689-4bca-a9d4-8ba31f606ca9',
        accountCode: AccountCode.create('1.1.01'),
        description,
        supplier,
        amount: Money.fromDecimal(10),
        competency: Competency.from('2026-07'),
        dueDate: DueDate.from('2026-08-01'),
        documentNumber: DocumentNumber.from('NF-1')
      });
    } catch (error) {
      expect(error).toBeInstanceOf(DomainValidationError);
    }
  });
});
