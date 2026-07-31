import type { Money } from '../value-objects/money';
import type { PaymentMethod } from '../enums/payment-method.js';

export interface CreatePaymentProps {
  id: string;
  payableId: string;
  amount: Money;
  paymentDate: Date;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export class Payment {
  readonly id: string;
  readonly payableId: string;
  readonly amount: Money;
  readonly paymentDate: Date;
  readonly method: PaymentMethod;
  readonly reference?: string;
  readonly notes?: string;

  private constructor(props: CreatePaymentProps) {
    this.id = props.id;
    this.payableId = props.payableId;
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
