import { AggregateRoot, DomainValidationError, UniqueEntityId } from '@vero/core-domain';

import type { AccountCode } from '../value-objects/account-code.js';
import type { Competency } from '../value-objects/competency.js';
import type { DocumentNumber } from '../value-objects/document-number.js';
import type { DueDate } from '../value-objects/due-date.js';
import type { Money } from '../value-objects/money.js';
import { PayableStatus } from '../enums/payable-status.js';

export interface CreatePayableProps {
  id: string;
  accountCode: AccountCode;
  description: string;
  supplier: string;
  amount: Money;
  competency: Competency;
  dueDate: DueDate;
  documentNumber: DocumentNumber;
}

export class Payable extends AggregateRoot<UniqueEntityId> {
  readonly accountCode: AccountCode;
  readonly description: string;
  readonly supplier: string;
  readonly amount: Money;
  readonly competency: Competency;
  readonly dueDate: DueDate;
  readonly documentNumber: DocumentNumber;

  private status: PayableStatus;
  private readonly installments: unknown[] = [];
  private readonly payments: unknown[] = [];

  private constructor(props: CreatePayableProps) {
    super(UniqueEntityId.create(props.id));
    this.accountCode = props.accountCode;
    this.description = props.description.trim();
    this.supplier = props.supplier.trim();
    this.amount = props.amount;
    this.competency = props.competency;
    this.dueDate = props.dueDate;
    this.documentNumber = props.documentNumber;
    this.status = PayableStatus.PENDING;
  }

  static create(props: CreatePayableProps): Payable {
    if (!props.description.trim()) {
      throw new DomainValidationError(
        'Description is required.',
        'FINANCE_PAYABLE_DESCRIPTION_REQUIRED'
      );
    }

    if (!props.supplier.trim()) {
      throw new DomainValidationError('Supplier is required.', 'FINANCE_PAYABLE_SUPPLIER_REQUIRED');
    }

    return new Payable(props);
  }

  getStatus(): PayableStatus {
    return this.status;
  }

  getInstallments(): readonly unknown[] {
    return this.installments;
  }

  getPayments(): readonly unknown[] {
    return this.payments;
  }
}
