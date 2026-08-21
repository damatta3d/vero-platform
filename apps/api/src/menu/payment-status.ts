import type { PaymentStatus } from './payment.types.js';

export function mapMercadoPagoPaymentStatus(
  status?: string,
  statusDetail?: string | null
): PaymentStatus {
  switch (status?.toLowerCase()) {
    case 'processed':
    case 'approved':
      return statusDetail === 'partially_refunded' ? 'REFUNDED' : 'PAID';
    case 'refunded':
      return 'REFUNDED';
    case 'charged_back':
      return 'CHARGED_BACK';
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'CANCELLED';
    case 'failed':
    case 'rejected':
      return 'FAILED';
    case 'action_required':
    case 'created':
    case 'processing':
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'AWAITING_PAYMENT';
    default:
      return 'PENDING';
  }
}

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED', 'CHARGED_BACK'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  CHARGED_BACK: []
};

export function canTransitionPaymentStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function isOrderCreatablePaymentStatus(method: string, status: PaymentStatus): boolean {
  return method === 'PAY_ON_DELIVERY'
    ? status === 'PENDING'
    : method === 'PIX' && (status === 'AWAITING_PAYMENT' || status === 'PAID');
}
