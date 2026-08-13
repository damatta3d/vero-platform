export type PaymentMethod = 'PIX' | 'PAY_ON_DELIVERY';
export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentRequest = {
  checkoutId?: string;
  menuSlug: string;
  method: PaymentMethod;
  amountCents: number;
  customerName: string;
  customerPhone: string;
};

export type PaymentResult = {
  paymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  pixCopyPaste?: string | null;
  qrCodeUrl?: string | null;
  expiresAt?: string | null;
};

export interface PaymentGateway {
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
}
