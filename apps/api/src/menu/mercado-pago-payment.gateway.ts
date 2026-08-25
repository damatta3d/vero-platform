import { mapMercadoPagoPaymentStatus } from './payment-status.js';
import type {
  PaymentGateway,
  ProviderPaymentSnapshot,
  ProviderPixRequest
} from './payment.types.js';

type MercadoPagoOrder = {
  id?: string | number;
  total_amount?: string | number;
  external_reference?: string;
  transactions?: {
    payments?: Array<{
      id?: string | number;
      status?: string;
      status_detail?: string;
      amount?: string | number;
      expiration_time?: string;
      date_of_expiration?: string;
      payment_method?: {
        id?: string;
        type?: string;
        ticket_url?: string;
        qr_code?: string;
        qr_code_base64?: string;
      };
    }>;
  };
};

const maximumPaymentCents = 100_000_000;

export function mercadoPagoAmountToCents(value: string | number | undefined): number {
  const normalized = typeof value === 'number' ? value.toFixed(2) : value;
  if (!normalized || !/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('MERCADO_PAGO_INVALID_AMOUNT');
  }
  const [whole, fractional = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > maximumPaymentCents) {
    throw new Error('MERCADO_PAGO_INVALID_AMOUNT');
  }
  return cents;
}

export class MercadoPagoPaymentGateway implements PaymentGateway {
  constructor(private readonly accessToken: string) {
    if (!accessToken.trim()) throw new Error('MERCADO_PAGO_ACCESS_TOKEN_REQUIRED');
  }

  async createPixPayment(request: ProviderPixRequest): Promise<ProviderPaymentSnapshot> {
    const amount = (request.amountCents / 100).toFixed(2);
    const body = {
      type: 'online',
      total_amount: amount,
      external_reference: request.externalReference,
      processing_mode: 'automatic',
      payer: { email: request.customerEmail, first_name: request.customerName },
      transactions: {
        payments: [
          {
            amount,
            payment_method: { id: 'pix', type: 'bank_transfer' }
          }
        ]
      }
    };
    const order = await this.request('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': request.idempotencyKey
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    });
    return this.snapshot(order);
  }

  async getOrder(providerOrderId: string): Promise<ProviderPaymentSnapshot> {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(providerOrderId)) {
      throw new Error('MERCADO_PAGO_INVALID_ORDER_ID');
    }
    const order = await this.request(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(10_000)
      }
    );
    return this.snapshot(order);
  }

  private async request(url: string, init: RequestInit): Promise<MercadoPagoOrder> {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`MERCADO_PAGO_HTTP_${response.status}`);
    return (await response.json()) as MercadoPagoOrder;
  }

  private snapshot(order: MercadoPagoOrder): ProviderPaymentSnapshot {
    const payment = order.transactions?.payments?.[0];
    const providerOrderId = order.id === undefined ? '' : String(order.id).trim();
    const providerPaymentId = payment?.id === undefined ? '' : String(payment.id).trim();
    const externalReference = order.external_reference?.trim() || '';
    if (
      !/^[A-Za-z0-9_-]{1,160}$/.test(providerOrderId) ||
      !/^[A-Za-z0-9_-]{1,160}$/.test(providerPaymentId) ||
      !/^vero_[0-9a-f]{32}$/.test(externalReference) ||
      !payment?.status
    ) {
      throw new Error('MERCADO_PAGO_INVALID_RESPONSE');
    }
    const orderAmount = mercadoPagoAmountToCents(order.total_amount);
    const paymentAmount = mercadoPagoAmountToCents(payment.amount);
    if (orderAmount !== paymentAmount) throw new Error('MERCADO_PAGO_AMOUNT_MISMATCH');
    const method = payment.payment_method;
    if (method?.id !== 'pix' || method.type !== 'bank_transfer') {
      throw new Error('MERCADO_PAGO_PAYMENT_METHOD_MISMATCH');
    }
    const expiration =
      payment.date_of_expiration?.trim() || payment.expiration_time?.trim() || null;
    if (expiration && Number.isNaN(new Date(expiration).getTime())) {
      throw new Error('MERCADO_PAGO_INVALID_EXPIRATION');
    }
    return {
      providerOrderId,
      providerPaymentId,
      externalReference,
      amountCents: orderAmount,
      providerStatus: payment.status,
      providerStatusDetail: payment.status_detail?.trim() || null,
      status: mapMercadoPagoPaymentStatus(payment.status, payment.status_detail),
      pixCopyPaste: method.qr_code?.trim() || null,
      qrCodeBase64: method.qr_code_base64?.trim() || null,
      pixTicketUrl: method.ticket_url?.trim() || null,
      expiresAt: expiration ? new Date(expiration).toISOString() : null
    };
  }
}
