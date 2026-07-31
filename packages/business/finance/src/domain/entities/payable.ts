import {
  AggregateRoot,
  DomainValidationError,
  UniqueEntityId,
} from '@vero/core-domain';

import { PayableStatus } from '../enums/payable-status.js';
import { Competency } from '../value-objects/competency.js';
import { DocumentNumber } from '../value-objects/document-number.js';
import { DueDate } from '../value-objects/due-date.js';
import { Money } from '../value-objects/money.js';

export interface CreatePayableProps {
  readonly id: string;
  readonly tenantId: string;
  readonly accountId: string;
  readonly supplier: string;
  readonly description: string;
  readonly amount: Money;
  readonly competency: Competency;
  readonly dueDate: DueDate;
  readonly documentNumber: DocumentNumber;
  readonly status?: PayableStatus;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export class Payable extends AggregateRoot<UniqueEntityId> {
  readonly tenantId: UniqueEntityId;
  readonly accountId: UniqueEntityId;
  readonly supplier: string;
  readonly description: string;
  readonly amount: Money;
  readonly competency: Competency;
  readonly dueDate: DueDate;
  readonly documentNumber: DocumentNumber;
  readonly createdAt: Date;

  private status: PayableStatus;
  private updatedAt: Date;

  private readonly installments: unknown[] = [];
  private readonly payments: unknown[] = [];

  private constructor(props: CreatePayableProps) {
    super(UniqueEntityId.from(props.id));

    this.tenantId = UniqueEntityId.from(props.tenantId);
    this.accountId = UniqueEntityId.from(props.accountId);
    this.supplier = Payable.required(props.supplier, 'supplier');
    this.description = Payable.required(props.description, 'description');
    this.amount = props.amount;
    this.competency = props.competency;
    this.dueDate = props.dueDate;
    this.documentNumber = props.documentNumber;
    this.status = props.status ?? PayableStatus.PENDING;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt ?? props.createdAt);
  }

  static create(props: CreatePayableProps): Payable {
    return new Payable(props);
  }

  getStatus(): PayableStatus {
    return this.status;
  }

  get lastUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  markAsPaid(updatedAt: Date = new Date()): void {
    this.status = PayableStatus.PAID;
    this.updatedAt = updatedAt;
  }

  markAsCancelled(updatedAt: Date = new Date()): void {
    this.status = PayableStatus.CANCELLED;
    this.updatedAt = updatedAt;
  }

  markAsPartiallyPaid(updatedAt: Date = new Date()): void {
    this.status = PayableStatus.PARTIALLY_PAID;
    this.updatedAt = updatedAt;
  }

  getInstallments(): readonly unknown[] {
    return [...this.installments];
  }

  getPayments(): readonly unknown[] {
    return [...this.payments];
  }

  private static required(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new DomainValidationError(
        `Invalid ${field}`,
        `FINANCE_PAYABLE_${field.toUpperCase()}_INVALID`,
        { field },
      );
    }

    return normalized;
  }
}