import { createHmac } from 'node:crypto';
import {
  PaymentWebhookController,
  mercadoPagoSignatureParts,
  verifyMercadoPagoSignature
} from './payment-webhook.controller.js';

describe('Mercado Pago webhook authentication', () => {
  it('validates the official manifest with a lowercased data id', () => {
    const secret = 'webhook-secret';
    const dataId = 'ORD01ABCDEF';
    const requestId = 'request-123';
    const ts = '1787335200';
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const digest = createHmac('sha256', secret).update(manifest).digest('hex');

    expect(verifyMercadoPagoSignature(`ts=${ts},v1=${digest}`, requestId, dataId, secret)).toBe(
      true
    );
    expect(
      verifyMercadoPagoSignature(`ts=${ts},v1=${digest}`, requestId, dataId.toLowerCase(), secret)
    ).toBe(true);
    expect(
      verifyMercadoPagoSignature(`ts=${ts},v1=${'0'.repeat(64)}`, requestId, dataId, secret)
    ).toBe(false);
  });

  it('rejects missing and malformed signature parts', () => {
    expect(mercadoPagoSignatureParts('ts=123')).toEqual({ ts: '123', v1: undefined });
    expect(verifyMercadoPagoSignature('ts=x,v1=abc', 'request', 'order', 'secret')).toBe(false);
  });

  it('cancels a linked unpaid order when the provider marks PIX as failed', async () => {
    const oldSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const secret = 'webhook-secret';
    const providerOrderId = 'ORD_FAILED_1';
    const providerPaymentId = 'PAY_FAILED_1';
    const externalReference = `vero_${'a'.repeat(32)}`;
    const requestId = 'request-failed-1';
    const ts = '1787335200';
    const paymentId = '11111111-1111-4111-8111-111111111111';
    const orderId = '22222222-2222-4222-8222-222222222222';
    const couponId = '33333333-3333-4333-8333-333333333333';
    const digest = createHmac('sha256', secret)
      .update(`id:${providerOrderId.toLowerCase()};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    const database = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: paymentId,
            tenantId: 'tenant-a',
            checkoutKeyHash: 'checkout-hash',
            requestHash: 'request-hash',
            orderId,
            provider: 'MERCADO_PAGO',
            providerOrderId,
            providerPaymentId,
            externalReference,
            method: 'PIX',
            amountCents: 4590,
            currency: 'BRL',
            status: 'AWAITING_PAYMENT',
            providerStatus: 'pending',
            providerStatusDetail: null,
            pixCopyPaste: null,
            qrCodeBase64: null,
            pixTicketUrl: null,
            expiresAt: null
          }
        ])
        .mockResolvedValueOnce([
          {
            status: 'RECEIVED',
            fulfillment: 'PICKUP',
            paymentMethod: 'PIX',
            paymentStatus: 'FAILED',
            couponId
          }
        ]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn()
    };
    database.$transaction.mockImplementation(async (callback) => callback(database));
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'access-token';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: providerOrderId,
        total_amount: '45.90',
        external_reference: externalReference,
        transactions: {
          payments: [
            {
              id: providerPaymentId,
              status: 'failed',
              amount: '45.90',
              payment_method: { id: 'pix', type: 'bank_transfer' }
            }
          ]
        }
      })
    } as Response);

    try {
      const controller = new PaymentWebhookController(database as never);
      await expect(
        controller.receive(
          { type: 'order', data: { id: providerOrderId } },
          providerOrderId,
          `ts=${ts},v1=${digest}`,
          requestId
        )
      ).resolves.toMatchObject({
        received: true,
        reconciled: true,
        paymentStatus: 'FAILED'
      });
      expect(
        database.$executeRawUnsafe.mock.calls.some(
          ([query, status]) =>
            String(query).includes('SET status=$1::varchar(32)') && status === 'CANCELLED'
        )
      ).toBe(true);
      expect(
        database.$executeRawUnsafe.mock.calls.some(
          ([query, tenantId, persistedCouponId]) =>
            String(query).includes('commerce_coupons') &&
            tenantId === 'tenant-a' &&
            persistedCouponId === couponId
        )
      ).toBe(true);
    } finally {
      fetchMock.mockRestore();
      if (oldSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      else process.env.MERCADO_PAGO_WEBHOOK_SECRET = oldSecret;
      if (oldToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      else process.env.MERCADO_PAGO_ACCESS_TOKEN = oldToken;
    }
  });
});
