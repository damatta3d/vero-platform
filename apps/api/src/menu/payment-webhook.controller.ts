import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Headers,
  Inject,
  Logger,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MercadoPagoPaymentGateway } from './mercado-pago-payment.gateway.js';
import type { PaymentDatabase } from './payment-attempt.repository.js';
import { reconcileProviderPayment, storeWebhookSnapshot } from './payment-reconciliation.js';
import { transitionPersistedOrder } from './order-workflow.js';

type MercadoPagoWebhook = { action?: string; type?: string; data?: { id?: string | number } };

export function mercadoPagoSignatureParts(value: string): {
  ts: string | undefined;
  v1: string | undefined;
} {
  const parts: { ts: string | undefined; v1: string | undefined } = {
    ts: undefined,
    v1: undefined
  };
  for (const entry of value.split(',')) {
    const [key, val] = entry.trim().split('=', 2);
    if (key === 'ts' && !parts.ts) parts.ts = val;
    if (key === 'v1' && !parts.v1) parts.v1 = val;
  }
  return parts;
}

export function verifyMercadoPagoSignature(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string
): boolean {
  const { ts, v1 } = mercadoPagoSignatureParts(signature);
  if (!ts || !/^\d{1,20}$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const receivedBytes = Buffer.from(v1, 'hex');
  const candidateIds = [...new Set([dataId.toLowerCase(), dataId])];
  return candidateIds.some((candidateId) => {
    const manifest = `id:${candidateId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    return (
      expectedBytes.byteLength === receivedBytes.byteLength &&
      timingSafeEqual(expectedBytes, receivedBytes)
    );
  });
}

@Controller('v1/payments/webhooks')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: PaymentDatabase) {}

  @Post('mercado-pago')
  async receive(
    @Body() event: MercadoPagoWebhook,
    @Query('data.id') queryDataId?: string,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string
  ) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    const bodyDataId = event.data?.id === undefined ? '' : String(event.data.id);
    const dataId = queryDataId?.trim() || '';
    if (
      !secret ||
      !accessToken ||
      !signature ||
      !requestId ||
      requestId.length > 160 ||
      !dataId ||
      bodyDataId !== dataId ||
      event.type !== 'order' ||
      !verifyMercadoPagoSignature(signature, requestId, dataId, secret)
    ) {
      throw new UnauthorizedException('Notificação de pagamento inválida.');
    }

    this.logger.log(`Payment webhook authenticated request=${requestId} resource=${dataId}`);
    const snapshot = await new MercadoPagoPaymentGateway(accessToken).getOrder(dataId);
    if (snapshot.providerOrderId !== dataId) {
      throw new UnauthorizedException('Notificação de pagamento inválida.');
    }
    await storeWebhookSnapshot(this.db, snapshot, requestId);
    const result = await reconcileProviderPayment(this.db, snapshot, requestId);
    if (!result.matched) {
      this.logger.warn(
        `Payment webhook waiting for local attempt request=${requestId} resource=${dataId}`
      );
      throw new ServiceUnavailableException('Reconciliação de pagamento pendente.');
    }
    if (
      result.shouldConfirmAutomatically &&
      result.orderId &&
      result.tenantId &&
      result.paymentStatus === 'PAID'
    ) {
      try {
        await transitionPersistedOrder(
          this.db,
          result.tenantId,
          result.orderId,
          'CONFIRMED',
          'AUTO'
        );
      } catch (error) {
        this.logger.warn(
          `Automatic confirmation after payment skipped order=${result.orderId} reason=${
            error instanceof Error ? error.message : 'unknown'
          }`
        );
      }
    }
    this.logger.log(
      `Payment reconciled request=${requestId} payment=${result.paymentId} status=${result.paymentStatus} changed=${result.changed}`
    );
    return {
      received: true,
      authenticated: true,
      reconciled: true,
      changed: result.changed,
      provider: 'MERCADO_PAGO',
      paymentStatus: result.paymentStatus,
      requestId
    };
  }
}
