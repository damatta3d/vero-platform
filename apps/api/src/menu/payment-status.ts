import type { PaymentStatus } from './payment.types.js';

export function mapMercadoPagoPaymentStatus(status?: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'PAID';
    case 'cancelled':
      return 'CANCELLED';
    case 'rejected':
      return 'FAILED';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'AWAITING_PAYMENT';
    default:
      return 'PENDING';
  }
}
