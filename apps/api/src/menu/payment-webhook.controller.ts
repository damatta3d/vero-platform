import { createHmac, timingSafeEqual } from 'node:crypto';
import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';

type MercadoPagoWebhook = { action?: string; type?: string; data?: { id?: string | number } };

function signatureParts(value: string): { ts?: string; v1?: string } {
  const parts: { ts?: string; v1?: string } = {};
  for (const entry of value.split(',')) {
    const [key, val] = entry.trim().split('=', 2);
    if (key === 'ts') parts.ts = val;
    if (key === 'v1') parts.v1 = val;
  }
  return parts;
}

function validHexDigest(expected: string, received: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

@Controller('v1/payments/webhooks')
export class PaymentWebhookController {
  @Post('mercado-pago')
  receive(@Body() event: MercadoPagoWebhook, @Headers('x-signature') signature?: string, @Headers('x-request-id') requestId?: string) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    const dataId = event.data?.id ? String(event.data.id).toLowerCase() : undefined;
    if (!secret || !signature || !requestId || !dataId) throw new UnauthorizedException('Invalid webhook credentials.');

    const { ts, v1 } = signatureParts(signature);
    if (!ts || !v1) throw new UnauthorizedException('Invalid webhook signature.');
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    if (!validHexDigest(expected, v1)) throw new UnauthorizedException('Invalid webhook signature.');

    return { received: true, authenticated: true, provider: 'MERCADO_PAGO', eventType: event.type || event.action || null, providerPaymentId: dataId, requestId };
  }
}
