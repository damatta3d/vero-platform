import {
  MercadoPagoPaymentGateway,
  mercadoPagoAmountToCents
} from './mercado-pago-payment.gateway.js';

describe(MercadoPagoPaymentGateway.name, () => {
  const externalReference = `vero_${'a'.repeat(32)}`;

  afterEach(() => jest.restoreAllMocks());

  it('creates PIX through Orders API with stable idempotency and trusted amount', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'ORD-123',
          total_amount: '100.00',
          external_reference: externalReference,
          transactions: {
            payments: [
              {
                id: 'PAY-123',
                status: 'action_required',
                status_detail: 'waiting_transfer',
                amount: '100.00',
                payment_method: {
                  id: 'pix',
                  type: 'bank_transfer',
                  ticket_url: 'https://example.test/pix',
                  qr_code: '000201PIX',
                  qr_code_base64: 'cXItY29kZQ=='
                }
              }
            ]
          }
        })
    } as Response);
    const gateway = new MercadoPagoPaymentGateway(
      'test-access-token',
      'https://example.test/webhook'
    );

    await expect(
      gateway.createPixPayment({
        idempotencyKey: 'd4d45354-d71d-5d69-9811-474347999fd1',
        externalReference,
        amountCents: 10_000,
        customerName: 'Cliente',
        customerEmail: 'cliente@example.com'
      })
    ).resolves.toMatchObject({
      providerOrderId: 'ORD-123',
      providerPaymentId: 'PAY-123',
      amountCents: 10_000,
      status: 'AWAITING_PAYMENT',
      pixCopyPaste: '000201PIX',
      qrCodeBase64: 'cXItY29kZQ=='
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(new Headers(init?.headers).get('X-Idempotency-Key')).toBe(
      'd4d45354-d71d-5d69-9811-474347999fd1'
    );
    expect(typeof init?.body).toBe('string');
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      external_reference: externalReference,
      processing_mode: 'automatic',
      total_amount: '100.00',
      payer: { email: 'cliente@example.com' }
    });
    expect(JSON.stringify(body)).not.toContain('test-access-token');
  });

  it('rejects malformed, mismatched and out-of-range provider amounts', async () => {
    expect(() => mercadoPagoAmountToCents('NaN')).toThrow('MERCADO_PAGO_INVALID_AMOUNT');
    expect(() => mercadoPagoAmountToCents('-1.00')).toThrow('MERCADO_PAGO_INVALID_AMOUNT');
    expect(() => mercadoPagoAmountToCents('1000000.01')).toThrow('MERCADO_PAGO_INVALID_AMOUNT');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'ORD-123',
          total_amount: '100.00',
          external_reference: externalReference,
          transactions: {
            payments: [
              {
                id: 'PAY-123',
                status: 'processed',
                status_detail: 'accredited',
                amount: '99.99',
                payment_method: { id: 'pix', type: 'bank_transfer' }
              }
            ]
          }
        })
    } as Response);
    await expect(new MercadoPagoPaymentGateway('token').getOrder('ORD-123')).rejects.toThrow(
      'MERCADO_PAGO_AMOUNT_MISMATCH'
    );
  });
});
