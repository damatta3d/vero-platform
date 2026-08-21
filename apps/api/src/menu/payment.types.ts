export type PaymentMethod = 'PIX' | 'PAY_ON_DELIVERY';
export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGED_BACK';

export type ProviderPixRequest = {
  idempotencyKey: string;
  externalReference: string;
  amountCents: number;
  customerName: string;
  customerEmail: string;
};

export type PaymentResult = {
  paymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  pixCopyPaste?: string | null;
  qrCodeUrl?: string | null;
  pixTicketUrl?: string | null;
  expiresAt?: string | null;
};

export type ProviderPaymentSnapshot = {
  providerOrderId: string;
  providerPaymentId: string;
  externalReference: string;
  amountCents: number;
  providerStatus: string;
  providerStatusDetail: string | null;
  status: PaymentStatus;
  pixCopyPaste: string | null;
  qrCodeBase64: string | null;
  pixTicketUrl: string | null;
  expiresAt: string | null;
};

export interface PaymentGateway {
  createPixPayment(request: ProviderPixRequest): Promise<ProviderPaymentSnapshot>;
  getOrder(providerOrderId: string): Promise<ProviderPaymentSnapshot>;
}
