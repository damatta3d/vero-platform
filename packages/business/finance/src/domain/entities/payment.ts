import { Entity, UniqueEntityId } from '@vero/core-domain';

import type { PaymentMethod } from '../enums/payment-method.js';
import type { Money } from '../value-objects/money.js';

export interface CreatePaymentProps {
  id: string;
  payableId: string;
  amount: Money;
  paymentDate: Date;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export class Payment extends Entity<UniqueEntityId> {
  readonly payableId: UniqueEntityId;
  readonly amount: Money;
  readonly paymentDate: Date;
  readonly method: PaymentMethod;
  readonly reference?: string;
  readonly notes?: string;

  private constructor(props: CreatePaymentProps) {
    super(UniqueEntityId.create(props.id));
    this.payableId = UniqueEntityId.create(props.payableId);
    this.amount = props.amount;
    this.paymentDate = new Date(props.paymentDate);
    this.method = props.method;

    if (props.reference !== undefined) {
      this.reference = props.reference.trim();
    }

    if (props.notes !== undefined) {
      this.notes = props.notes.trim();
    }
  }

  static create(props: CreatePaymentProps): Payment {
    return new Payment(props);
  }
}
