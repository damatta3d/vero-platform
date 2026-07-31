import type { AccountCode } from '../value-objects/account-code.js';
import type { Competency } from '../value-objects/competency';
import type { DocumentNumber } from '../value-objects/document-number.js';
import type { DueDate } from '../value-objects/due-date.js';
import type { Money } from '../value-objects/money';
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

export class Payable {
  readonly id: string;
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
    this.id = props.id;
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
      throw new Error('Description is required.');
    }

    if (!props.supplier.trim()) {
      throw new Error('Supplier is required.');
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
