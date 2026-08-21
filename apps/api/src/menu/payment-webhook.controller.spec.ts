import { createHmac } from 'node:crypto';
import {
  mercadoPagoSignatureParts,
  verifyMercadoPagoSignature
} from './payment-webhook.controller.js';

describe('Mercado Pago webhook authentication', () => {
  it('validates the official manifest in constant-time-compatible hexadecimal form', () => {
    const secret = 'webhook-secret';
    const dataId = 'ORD01ABCDEF';
    const requestId = 'request-123';
    const ts = '1787335200';
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const digest = createHmac('sha256', secret).update(manifest).digest('hex');

    expect(verifyMercadoPagoSignature(`ts=${ts},v1=${digest}`, requestId, dataId, secret)).toBe(
      true
    );
    expect(
      verifyMercadoPagoSignature(`ts=${ts},v1=${digest}`, requestId, dataId.toLowerCase(), secret)
    ).toBe(false);
    expect(
      verifyMercadoPagoSignature(`ts=${ts},v1=${'0'.repeat(64)}`, requestId, dataId, secret)
    ).toBe(false);
  });

  it('rejects missing and malformed signature parts', () => {
    expect(mercadoPagoSignatureParts('ts=123')).toEqual({ ts: '123', v1: undefined });
    expect(verifyMercadoPagoSignature('ts=x,v1=abc', 'request', 'order', 'secret')).toBe(false);
  });
});
