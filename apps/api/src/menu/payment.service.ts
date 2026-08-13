import { randomUUID } from 'node:crypto';
import type { PaymentRequest, PaymentResult } from './payment.types.js';

export class PaymentService {
  async create(request: PaymentRequest): Promise<PaymentResult> {
    if (!Number.isInteger(request.amountCents) || request.amountCents <= 0) {
      throw new Error('INVALID_PAYMENT_AMOUNT');
    }
    if (request.method === 'PAY_ON_DELIVERY') {
      return {
        paymentId: randomUUID(),
        method: request.method,
        status: 'PENDING',
        amountCents: request.amountCents,
        pixCopyPaste: null,
        qrCodeUrl: null,
        expiresAt: null
      };
    }
    throw new Error('PIX_GATEWAY_NOT_CONFIGURED');
  }
}
