import {
  canTransitionPaymentStatus,
  isOrderCreatablePaymentStatus,
  mapMercadoPagoPaymentStatus
} from './payment-status.js';

describe('payment status policy', () => {
  it.each([
    ['action_required', 'waiting_transfer', 'AWAITING_PAYMENT'],
    ['processing', 'in_process', 'AWAITING_PAYMENT'],
    ['processed', 'accredited', 'PAID'],
    ['failed', 'high_risk', 'FAILED'],
    ['expired', 'expired', 'CANCELLED'],
    ['cancelled', null, 'CANCELLED'],
    ['refunded', 'refunded', 'REFUNDED'],
    ['charged_back', 'settled', 'CHARGED_BACK'],
    ['approved', 'accredited', 'PAID'],
    ['rejected', null, 'FAILED']
  ])('maps Mercado Pago %s/%s to %s', (status, detail, expected) => {
    expect(mapMercadoPagoPaymentStatus(status, detail)).toBe(expected);
  });

  it('prevents delayed events from regressing a paid or reversed payment', () => {
    expect(canTransitionPaymentStatus('AWAITING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransitionPaymentStatus('PAID', 'AWAITING_PAYMENT')).toBe(false);
    expect(canTransitionPaymentStatus('PAID', 'REFUNDED')).toBe(true);
    expect(canTransitionPaymentStatus('REFUNDED', 'PAID')).toBe(false);
    expect(canTransitionPaymentStatus('CHARGED_BACK', 'PAID')).toBe(false);
  });

  it('allows an order only for a server-created pending PIX or pay-on-delivery attempt', () => {
    expect(isOrderCreatablePaymentStatus('PIX', 'AWAITING_PAYMENT')).toBe(true);
    expect(isOrderCreatablePaymentStatus('PIX', 'PAID')).toBe(true);
    expect(isOrderCreatablePaymentStatus('PIX', 'PENDING')).toBe(false);
    expect(isOrderCreatablePaymentStatus('PIX', 'FAILED')).toBe(false);
    expect(isOrderCreatablePaymentStatus('PAY_ON_DELIVERY', 'PENDING')).toBe(true);
    expect(isOrderCreatablePaymentStatus('PAY_ON_DELIVERY', 'PAID')).toBe(false);
  });
});
