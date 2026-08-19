import {
  assertOrderTransition,
  nextOrderStatuses,
  transitionPersistedOrder
} from './order-workflow';

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

  it('persists manual and automatic confirmation through the shared state machine', async () => {
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          status: 'RECEIVED',
          fulfillment: 'PICKUP',
          paymentMethod: 'PAY_ON_DELIVERY',
          paymentStatus: 'PENDING'
        }
      ]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1)
    };

    await expect(
      transitionPersistedOrder(database, 'tenant-a', 'order-a', 'CONFIRMED', 'AUTO')
    ).resolves.toEqual({ status: 'CONFIRMED', fulfillment: 'PICKUP' });
    expect(database.$executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('confirmed_source'),
      'CONFIRMED',
      'order-a',
      'tenant-a',
      'RECEIVED',
      'AUTO'
    );
    expect(database.$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it('rejects automatic confirmation when the state machine rejects the transition', async () => {
    const database = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          status: 'PREPARING',
          fulfillment: 'PICKUP',
          paymentMethod: 'PAY_ON_DELIVERY',
          paymentStatus: 'PENDING'
        }
      ]),
      $executeRawUnsafe: jest.fn()
    };

    await expect(
      transitionPersistedOrder(database, 'tenant-a', 'order-a', 'CONFIRMED', 'AUTO')
    ).rejects.toThrow('INVALID_ORDER_TRANSITION:PREPARING->CONFIRMED');
    expect(database.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
