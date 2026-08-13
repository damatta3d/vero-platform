import { randomUUID } from 'node:crypto';
import type { PaymentGateway, PaymentRequest, PaymentResult } from './payment.types.js';

type MercadoPagoOrder = {
  id?: string;
  status?: string;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      payment_method?: { id?: string; type?: string };
      payment_method_details?: {
        digital_wallet?: { qr_code?: string; qr_code_base64?: string };
      };
    }>;
  };
};

export class MercadoPagoPaymentGateway implements PaymentGateway {
  constructor(
    private readonly accessToken: string,
    private readonly notificationUrl?: string
  ) {
    if (!accessToken.trim()) throw new Error('MERCADO_PAGO_ACCESS_TOKEN_REQUIRED');
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (request.method !== 'PIX') throw new Error('UNSUPPORTED_PAYMENT_METHOD');

    const idempotencyKey = request.checkoutId?.trim() || randomUUID();
    const body = {
      type: 'online',
      total_amount: (request.amountCents / 100).toFixed(2),
      external_reference: request.checkoutId || idempotencyKey,
      payer: { first_name: request.customerName },
      transactions: {
        payments: [
          {
            amount: (request.amountCents / 100).toFixed(2),
            payment_method: { id: 'pix', type: 'bank_transfer' }
          }
        ]
      },
      ...(this.notificationUrl ? { notification_url: this.notificationUrl } : {})
    };

    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`MERCADO_PAGO_ERROR_${response.status}`);
    const order = (await response.json()) as MercadoPagoOrder;
    const payment = order.transactions?.payments?.[0];
    const wallet = payment?.payment_method_details?.digital_wallet;

    return {
      paymentId: String(payment?.id || order.id || idempotencyKey),
      method: 'PIX',
      status: payment?.status === 'approved' ? 'PAID' : 'AWAITING_PAYMENT',
      amountCents: request.amountCents,
      pixCopyPaste: wallet?.qr_code || null,
      qrCodeUrl: wallet?.qr_code_base64
        ? `data:image/png;base64,${wallet.qr_code_base64}`
        : null,
      expiresAt: null
    };
  }
}
