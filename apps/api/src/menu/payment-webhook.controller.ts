import { createHmac, timingSafeEqual } from 'node:crypto';
import { Body, Controller, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';

type Db = { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> };
type MercadoPagoWebhook = { action?: string; type?: string; data?: { id?: string | number } };
type MercadoPagoPayment = { id?: string | number; status?: string };

function signatureParts(value: string): { ts?: string; v1?: string } {
  const parts: { ts?: string; v1?: string } = {};
  for (const entry of value.split(',')) { const [key, val] = entry.trim().split('=', 2); if (key === 'ts') parts.ts = val; if (key === 'v1') parts.v1 = val; }
  return parts;
}
function validHexDigest(expected: string, received: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
function mapPaymentStatus(status?: string): 'PAID' | 'AWAITING_PAYMENT' | 'FAILED' | 'CANCELLED' {
  if (status === 'approved') return 'PAID';
  if (status === 'cancelled' || status === 'refunded' || status === 'charged_back') return 'CANCELLED';
  if (status === 'rejected') return 'FAILED';
  return 'AWAITING_PAYMENT';
}

@Controller('v1/payments/webhooks')
export class PaymentWebhookController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}
  @Post('mercado-pago')
  async receive(@Body() event: MercadoPagoWebhook, @Headers('x-signature') signature?: string, @Headers('x-request-id') requestId?: string) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    const dataId = event.data?.id ? String(event.data.id).toLowerCase() : undefined;
    if (!secret || !accessToken || !signature || !requestId || !dataId) throw new UnauthorizedException('Invalid webhook credentials.');
    const { ts, v1 } = signatureParts(signature);
    if (!ts || !v1) throw new UnauthorizedException('Invalid webhook signature.');
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    if (!validHexDigest(expected, v1)) throw new UnauthorizedException('Invalid webhook signature.');

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return { received: true, reconciled: false, providerPaymentId: dataId };
    const payment = (await response.json()) as MercadoPagoPayment;
    const paymentStatus = mapPaymentStatus(payment.status);
    const changed = await this.db.$executeRawUnsafe(`UPDATE commerce_native_orders SET payment_status=$1,updated_at=NOW() WHERE provider_payment_id=$2 AND payment_status<>$1`, paymentStatus, dataId);
    return { received: true, authenticated: true, reconciled: changed > 0, provider: 'MERCADO_PAGO', providerPaymentId: dataId, paymentStatus, requestId };
  }
}
