import {
  DomainValidationError,
  Entity,
  UniqueEntityId,
} from '@vero/core-domain';

import type { PaymentMethod } from '../enums/payment-method.js';
import type { Money } from '../value-objects/money.js';

export interface CreatePaymentProps {
  readonly id: string;
  readonly tenantId: string;
  readonly payableId: string;
  readonly amount: Money;
  readonly paymentDate: Date;
  readonly method: PaymentMethod;
  readonly reference?: string;
  readonly notes?: string;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export class Payment extends Entity<UniqueEntityId> {
  readonly tenantId: UniqueEntityId;
  readonly payableId: UniqueEntityId;
  readonly amount: Money;
  readonly paymentDate: Date;
  readonly method: PaymentMethod;
  readonly reference?: string;
  readonly notes?: string;
  readonly createdAt: Date;

  private updatedAt: Date;

  private constructor(props: CreatePaymentProps) {
    super(UniqueEntityId.from(props.id));

    this.tenantId = UniqueEntityId.from(props.tenantId);
    this.payableId = UniqueEntityId.from(props.payableId);
    this.amount = props.amount;
    this.paymentDate = new Date(props.paymentDate);
    this.method = props.method;

    this.reference = props.reference?.trim() || undefined;
    this.notes = props.notes?.trim() || undefined;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt ?? props.createdAt);
  }

  static create(props: CreatePaymentProps): Payment {
    if (Number.isNaN(props.paymentDate.getTime())) {
      throw new DomainValidationError(
        'Invalid payment date.',
        'FINANCE_PAYMENT_DATE_INVALID',
      );
    }

    return new Payment(props);
  }

  get lastUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }
}