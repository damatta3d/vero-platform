import { evaluateStoreAvailability, type StoreAvailabilityInput } from './store-availability';

function settings(overrides: Partial<StoreAvailabilityInput> = {}): StoreAvailabilityInput {
  return {
    operationallyOpen: true,
    timezone: 'America/Campo_Grande',
    schedule: [
      { weekday: 'MONDAY', enabled: true, opensAt: '10:00', closesAt: '14:00' },
      { weekday: 'TUESDAY', enabled: true, opensAt: '10:00', closesAt: '14:00' },
      { weekday: 'WEDNESDAY', enabled: false, opensAt: null, closesAt: null },
      { weekday: 'THURSDAY', enabled: false, opensAt: null, closesAt: null },
      { weekday: 'FRIDAY', enabled: false, opensAt: null, closesAt: null },
      { weekday: 'SATURDAY', enabled: false, opensAt: null, closesAt: null },
      { weekday: 'SUNDAY', enabled: false, opensAt: null, closesAt: null }
    ],
    ...overrides
  };
}

describe('evaluateStoreAvailability', () => {
  it('accepts the exact opening boundary and rejects the exact closing boundary', () => {
    expect(
      evaluateStoreAvailability(settings(), new Date('2026-08-17T14:00:00.000Z')).canAcceptOrders
    ).toBe(true);
    expect(
      evaluateStoreAvailability(settings(), new Date('2026-08-17T18:00:00.000Z'))
    ).toMatchObject({ canAcceptOrders: false, reason: 'OUTSIDE_SCHEDULE' });
  });

  it('requires both the manual switch and the weekly schedule', () => {
    const withinSchedule = new Date('2026-08-17T15:00:00.000Z');
    expect(evaluateStoreAvailability(settings(), withinSchedule).canAcceptOrders).toBe(true);
    expect(
      evaluateStoreAvailability(settings({ operationallyOpen: false }), withinSchedule)
    ).toMatchObject({
      canAcceptOrders: false,
      nextOpening: null,
      reason: 'MANUALLY_CLOSED',
      statusMessage: 'Loja temporariamente fechada'
    });
  });

  it('finds the next opening across a day boundary and Sunday', () => {
    expect(
      evaluateStoreAvailability(settings(), new Date('2026-08-23T19:00:00.000Z'))
    ).toMatchObject({
      canAcceptOrders: false,
      nextOpening: 'Abre amanhã às 10:00',
      statusMessage: 'Fechado agora · Abre amanhã às 10:00'
    });
  });

  it('uses the configured store timezone instead of the server timezone', () => {
    const instant = new Date('2026-08-17T14:30:00.000Z');
    expect(evaluateStoreAvailability(settings(), instant).canAcceptOrders).toBe(true);
    expect(evaluateStoreAvailability(settings({ timezone: 'UTC' }), instant).canAcceptOrders).toBe(
      false
    );
  });
});
