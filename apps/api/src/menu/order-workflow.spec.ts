import { assertOrderTransition, nextOrderStatuses } from './order-workflow';

describe('order workflow fulfillment rules', () => {
  it('does not allow dispatching pickup orders that are ready', () => {
    expect(nextOrderStatuses('READY', 'PICKUP')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(() => assertOrderTransition('READY', 'DISPATCHED', 'PICKUP')).toThrow(
      'INVALID_ORDER_TRANSITION:READY->DISPATCHED'
    );
  });

  it('keeps dispatch available for ready delivery orders', () => {
    expect(nextOrderStatuses('READY', 'DELIVERY')).toEqual([
      'DISPATCHED',
      'COMPLETED',
      'CANCELLED'
    ]);
    expect(() => assertOrderTransition('READY', 'DISPATCHED', 'DELIVERY')).not.toThrow();
  });
});
