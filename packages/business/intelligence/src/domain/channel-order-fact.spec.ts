import type { ExternalOrder } from '@vero/business-sales';
import {
  createChannelOrderFact,
  InvalidChannelOrderFactError,
  type OrderPseudonymizer
} from './channel-order-fact.js';

const order: ExternalOrder = Object.freeze({
  currency: 'BRL',
  identity: Object.freeze({
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-1',
    orderExternalId: 'raw-order-123',
    idempotencyKey: 'operational-key',
    reference: '42'
  }),
  merchant: Object.freeze({ externalId: 'merchant-1', name: 'Santo Parma', unit: '' }),
  source: Object.freeze({
    salesChannel: 'DELIVERY',
    origin: 'WHATSAPP',
    type: 'DELIVERY',
    menuVersion: 7
  }),
  createdAt: '2026-07-29T18:00:00.000Z',
  updatedAt: '2026-07-29T18:05:00.000Z',
  items: Object.freeze([
    Object.freeze({
      providerItemId: 'item-1',
      name: 'Parmegiana',
      quantity: 1,
      unitPriceCents: 4490,
      totalCents: 4990,
      modifiers: Object.freeze([
        Object.freeze({
          providerItemId: 'modifier-1',
          parentProviderItemId: 'item-1',
          name: 'Purê',
          quantity: 1,
          unitPriceCents: 500,
          totalCents: 500
        })
      ])
    })
  ]),
  discounts: Object.freeze([Object.freeze({ amountCents: 200, tag: 'CUPOM' })]),
  deliveryFeeCents: 800,
  additionalFeesCents: Object.freeze([]),
  payments: Object.freeze([
    Object.freeze({
      externalId: 'payment-secret',
      code: 'CREDIT',
      name: 'Cartão',
      card: 'VISA',
      prepaid: true,
      amountCents: 5290
    })
  ]),
  totalCents: 5290,
  customer: Object.freeze({ name: 'Cliente Secreto', phone: '67999999999' }),
  deliveryAddress: Object.freeze({
    formattedAddress: 'Rua Privada, 123',
    streetName: 'Rua Privada',
    streetNumber: '123',
    complement: '',
    neighborhood: 'Centro',
    city: 'Campo Grande',
    state: 'MS',
    country: 'BR',
    postalCode: '79000-000',
    latitude: -20.4,
    longitude: -54.6
  })
});

describe('ChannelOrderFact', () => {
  const pseudonymizer: OrderPseudonymizer = {
    pseudonymize: (scope) => `hmac-v1:${scope.tenantId}:${scope.connectionId}`
  };

  it('creates an immutable provider-neutral fact without direct PII or raw order identity', () => {
    const fact = createChannelOrderFact(
      {
        tenantId: 'santo-parma',
        connectionId: 'anota-ai-primary',
        order,
        observedAt: new Date('2026-07-29T18:06:00.000Z')
      },
      pseudonymizer
    );

    expect(fact).toMatchObject({
      tenantId: 'santo-parma',
      provider: 'ANOTA_AI',
      orderKey: 'hmac-v1:santo-parma:anota-ai-primary',
      revision: '2026-07-29T18:05:00.000Z',
      totalCents: 5290
    });
    expect(fact.lines).toHaveLength(2);
    expect(fact.adjustments).toEqual([
      { kind: 'DISCOUNT', amountCents: 200, label: 'CUPOM' },
      { kind: 'DELIVERY_FEE', amountCents: 800, label: 'Delivery' }
    ]);
    expect(Object.isFrozen(fact)).toBe(true);
    expect(Object.isFrozen(fact.lines)).toBe(true);

    const serialized = JSON.stringify(fact);
    for (const forbidden of [
      'raw-order-123',
      'operational-key',
      'Cliente Secreto',
      '67999999999',
      'Rua Privada',
      'payment-secret',
      'VISA'
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('requires tenant-scoped pseudonymization instead of persisting the external id', () => {
    expect(() =>
      createChannelOrderFact(
        {
          tenantId: 'santo-parma',
          connectionId: 'anota-ai-primary',
          order,
          observedAt: new Date('2026-07-29T18:06:00.000Z')
        },
        { pseudonymize: (_scope, externalOrderId) => externalOrderId }
      )
    ).toThrow(new InvalidChannelOrderFactError('orderKey'));
  });

  it('rejects observations older than the source event', () => {
    expect(() =>
      createChannelOrderFact(
        {
          tenantId: 'santo-parma',
          connectionId: 'anota-ai-primary',
          order,
          observedAt: new Date('2026-07-29T17:59:59.000Z')
        },
        pseudonymizer
      )
    ).toThrow(new InvalidChannelOrderFactError('observedAt'));
  });

  it('supports an order without discounts or delivery fee', () => {
    const fact = createChannelOrderFact(
      {
        tenantId: 'santo-parma',
        connectionId: 'anota-ai-primary',
        order: { ...order, discounts: [], deliveryFeeCents: 0 },
        observedAt: new Date('2026-07-29T18:06:00.000Z')
      },
      pseudonymizer
    );

    expect(fact.adjustments).toEqual([]);
  });

  it('rejects unsupported fees and malformed scalar values', () => {
    const create = (orderOverride: Partial<ExternalOrder>, tenantId = 'santo-parma') =>
      createChannelOrderFact(
        {
          tenantId,
          connectionId: 'anota-ai-primary',
          order: { ...order, ...orderOverride },
          observedAt: new Date('2026-07-29T18:06:00.000Z')
        },
        pseudonymizer
      );

    expect(() => create({ deliveryFeeCents: -1 })).toThrow(
      new InvalidChannelOrderFactError('order.deliveryFeeCents')
    );
    expect(() => create({ additionalFeesCents: [100] })).toThrow(
      new InvalidChannelOrderFactError('order.additionalFeesCents')
    );
    expect(() => create({ totalCents: Number.NaN })).toThrow(
      new InvalidChannelOrderFactError('order.totalCents')
    );
    expect(() => create({ createdAt: 'not-a-date' })).toThrow(
      new InvalidChannelOrderFactError('order.createdAt')
    );
    expect(() => create({}, 'x'.repeat(129))).toThrow(new InvalidChannelOrderFactError('tenantId'));

    const item = order.items[0];
    if (item === undefined) throw new Error('Test fixture must contain one item.');
    expect(() => create({ items: [{ ...item, quantity: Number.NaN }] })).toThrow(
      new InvalidChannelOrderFactError('order.lines.quantity')
    );
    expect(() => create({ items: [{ ...item, unitPriceCents: -1 }] })).toThrow(
      new InvalidChannelOrderFactError('order.lines.unitPriceCents')
    );
  });

  it('supports a valid order without modifiers, discounts or delivery fee', () => {
    const item = order.items[0];
    if (item === undefined) throw new Error('Test fixture must contain one item.');

    const minimalOrder: ExternalOrder = Object.freeze({
      ...order,
      items: Object.freeze([Object.freeze({ ...item, modifiers: Object.freeze([]) })]),
      discounts: Object.freeze([]),
      deliveryFeeCents: 0
    });

    const fact = createChannelOrderFact(
      {
        tenantId: 'santo-parma',
        connectionId: 'anota-ai-primary',
        order: minimalOrder,
        observedAt: new Date('2026-07-29T18:06:00.000Z')
      },
      pseudonymizer
    );

    expect(fact.lines).toHaveLength(1);
    expect(fact.adjustments).toEqual([]);
  });

  it('rejects malformed canonical fields instead of persisting partial facts', () => {
    const create = (candidateOrder: ExternalOrder, tenantId = 'santo-parma') =>
      createChannelOrderFact(
        {
          tenantId,
          connectionId: 'anota-ai-primary',
          order: candidateOrder,
          observedAt: new Date('2026-07-29T18:06:00.000Z')
        },
        pseudonymizer
      );

    expect(() => create(order, '   ')).toThrow(new InvalidChannelOrderFactError('tenantId'));
    expect(() =>
      create(
        Object.freeze({
          ...order,
          updatedAt: 'not-a-date'
        })
      )
    ).toThrow(new InvalidChannelOrderFactError('order.updatedAt'));
    expect(() =>
      create(
        Object.freeze({
          ...order,
          items: Object.freeze([])
        })
      )
    ).toThrow(new InvalidChannelOrderFactError('order.items'));

    const item = order.items[0];
    if (item === undefined) throw new Error('Test fixture must contain one item.');

    expect(() =>
      create(
        Object.freeze({
          ...order,
          items: Object.freeze([Object.freeze({ ...item, quantity: 0 })])
        })
      )
    ).toThrow(new InvalidChannelOrderFactError('order.lines.quantity'));
    expect(() =>
      create(
        Object.freeze({
          ...order,
          discounts: Object.freeze([Object.freeze({ amountCents: -1, tag: 'INVALID' })])
        })
      )
    ).toThrow(new InvalidChannelOrderFactError('order.discounts.amountCents'));
    expect(() =>
      create(
        Object.freeze({
          ...order,
          source: Object.freeze({ ...order.source, menuVersion: -1 })
        })
      )
    ).toThrow(new InvalidChannelOrderFactError('order.source.menuVersion'));
  });
});
