import { AnotaAiOrderTranslationError, translateAnotaAiOrder } from './anota-ai-order.mapper.js';

function orderFixture(): Record<string, unknown> {
  return {
    id: 'order-123',
    shortReference: 42,
    createdAt: '2026-07-29T12:00:00.000Z',
    updatedAt: '2026-07-29T12:01:00.000Z',
    salesChannel: 'ANOTA_AI',
    from: 'DELIVERY',
    type: 'DELIVERY',
    menu_version: 7,
    merchant: { id: 'merchant-1', name: 'O Santo Parma', unit: 'Matriz' },
    items: [
      {
        id: 10,
        externalId: 'vero-product-1',
        internalId: 'internal-product-1',
        backoffice_id: 'backoffice-product-1',
        name: 'Parmegiana de Alcatra',
        price: 41.9,
        quantity: 1,
        total: 46.9,
        subItems: [
          {
            id: 11,
            id_parent: 10,
            externalId: 'vero-modifier-1',
            internalId: 'internal-modifier-1',
            backoffice_id: 'backoffice-modifier-1',
            externalCode: 'EXTRA',
            name: 'Purê de batata',
            price: 5,
            quantity: 1,
            total: 5
          }
        ]
      }
    ],
    discounts: [{ amount: 2, tag: 'CUPOM' }],
    deliveryFee: 8,
    additionalFees: [],
    payments: [
      {
        externalId: 'payment-1',
        code: 'PIX',
        name: 'PIX',
        cardSelected: '',
        prepaid: true,
        changeFor: null,
        value: '52.90'
      }
    ],
    total: 52.9,
    customer: { name: 'Cliente de Teste', phone: '67999999999' },
    deliveryAddress: {
      formattedAddress: 'Rua de Teste, 100',
      streetName: 'Rua de Teste',
      streetNumber: '100',
      complement: '',
      neighborhood: 'Centro',
      city: 'Campo Grande',
      state: 'MS',
      country: 'BR',
      postalCode: '79000000',
      coordinates: { latitude: -20.4, longitude: -54.6 }
    }
  };
}

describe('translateAnotaAiOrder', () => {
  it('translates the observed order shape into the canonical external order', () => {
    const order = translateAnotaAiOrder(orderFixture(), {
      pageId: 'page-1',
      moneyUnit: 'MAJOR'
    });

    expect(order).toMatchObject({
      currency: 'BRL',
      identity: {
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1',
        orderExternalId: 'order-123',
        reference: '42'
      },
      merchant: {
        externalId: 'merchant-1',
        name: 'O Santo Parma',
        unit: 'Matriz'
      },
      source: {
        salesChannel: 'ANOTA_AI',
        origin: 'DELIVERY',
        type: 'DELIVERY'
      },
      deliveryFeeCents: 800,
      totalCents: 5290,
      items: [
        {
          providerItemId: '10',
          externalId: 'vero-product-1',
          unitPriceCents: 4190,
          totalCents: 4690,
          modifiers: [
            {
              providerItemId: '11',
              parentProviderItemId: '10',
              unitPriceCents: 500
            }
          ]
        }
      ],
      discounts: [{ amountCents: 200, tag: 'CUPOM' }],
      payments: [{ amountCents: 5290, prepaid: true }],
      customer: { name: 'Cliente de Teste' },
      deliveryAddress: { city: 'Campo Grande', state: 'MS' }
    });
    expect(order.identity.idempotencyKey).toMatch(/^anota-ai:[a-f0-9]{64}$/);
    expect(Object.isFrozen(order.items)).toBe(true);
  });

  it('generates a stable tenant-safe idempotency key', () => {
    const first = translateAnotaAiOrder(orderFixture(), {
      pageId: 'page-1',
      moneyUnit: 'MAJOR'
    });
    const repeated = translateAnotaAiOrder(orderFixture(), {
      pageId: 'page-1',
      moneyUnit: 'MAJOR'
    });
    const otherPage = translateAnotaAiOrder(orderFixture(), {
      pageId: 'page-2',
      moneyUnit: 'MAJOR'
    });

    expect(repeated.identity.idempotencyKey).toBe(first.identity.idempotencyKey);
    expect(otherPage.identity.idempotencyKey).not.toBe(first.identity.idempotencyKey);
  });

  it('supports provider amounts explicitly configured as integer cents', () => {
    const fixture = orderFixture();
    fixture['deliveryFee'] = 800;
    fixture['total'] = 5290;
    fixture['discounts'] = [{ amount: 200, tag: 'CUPOM' }];
    fixture['payments'] = [
      {
        externalId: 'payment-1',
        code: 'PIX',
        name: 'PIX',
        cardSelected: '',
        prepaid: true,
        changeFor: 6000,
        value: '5290'
      }
    ];
    const item = firstRecord(fixture['items'], 'fixture item');
    item['price'] = 4190;
    item['total'] = 4690;
    const modifier = firstRecord(item['subItems'], 'fixture modifier');
    modifier['price'] = 500;
    modifier['total'] = 500;

    const order = translateAnotaAiOrder(fixture, {
      pageId: 'page-1',
      moneyUnit: 'MINOR'
    });

    expect(order.totalCents).toBe(5290);
    expect(order.payments[0]?.changeForCents).toBe(6000);
  });

  it('translates unlinked products and modifiers without inventing catalog ids', () => {
    const fixture = orderFixture();
    const item = firstRecord(fixture['items'], 'fixture item');
    item['externalId'] = '';
    item['internalId'] = null;
    delete item['backoffice_id'];
    const modifier = firstRecord(item['subItems'], 'fixture modifier');
    modifier['externalId'] = '';

    const order = translateAnotaAiOrder(fixture, {
      pageId: 'page-1',
      moneyUnit: 'MAJOR'
    });

    expect(order.items[0]?.providerItemId).toBe('10');
    expect(order.items[0]?.externalId).toBeUndefined();
    expect(order.items[0]?.internalId).toBeUndefined();
    expect(order.items[0]?.backofficeId).toBeUndefined();
    expect(order.items[0]?.modifiers[0]?.providerItemId).toBe('11');
    expect(order.items[0]?.modifiers[0]?.externalId).toBeUndefined();
  });

  it('supports pickup orders without a delivery address', () => {
    const fixture = orderFixture();
    delete fixture['deliveryAddress'];

    const order = translateAnotaAiOrder(fixture, {
      pageId: 'page-1',
      moneyUnit: 'MAJOR'
    });

    expect(order.deliveryAddress).toBeUndefined();
  });

  it('rejects additional fees until their real item shape is observed', () => {
    const fixture = orderFixture();
    fixture['additionalFees'] = [{ amount: 1, name: 'service' }];

    expectTranslationError(
      () => translateAnotaAiOrder(fixture, { pageId: 'page-1', moneyUnit: 'MAJOR' }),
      'UNSUPPORTED_ADDITIONAL_FEES',
      'additionalFees'
    );
  });

  it('rejects ambiguous or malformed monetary amounts', () => {
    const fixture = orderFixture();
    fixture['total'] = '52.999';

    expectTranslationError(
      () => translateAnotaAiOrder(fixture, { pageId: 'page-1', moneyUnit: 'MAJOR' }),
      'INVALID_MONEY',
      'total'
    );
  });

  it('rejects decimal values when the provider is configured for cents', () => {
    expectTranslationError(
      () =>
        translateAnotaAiOrder(orderFixture(), {
          pageId: 'page-1',
          moneyUnit: 'MINOR'
        }),
      'INVALID_MONEY'
    );
  });

  it('rejects modifiers linked to a different parent item', () => {
    const fixture = orderFixture();
    const item = firstRecord(fixture['items'], 'fixture item');
    const modifier = firstRecord(item['subItems'], 'fixture modifier');
    modifier['id_parent'] = 999;

    expectTranslationError(
      () => translateAnotaAiOrder(fixture, { pageId: 'page-1', moneyUnit: 'MAJOR' }),
      'INVALID_ORDER',
      'items[0].subItems[0].id_parent'
    );
  });

  it.each([
    ['id', ''],
    ['items', null],
    ['createdAt', 'not-a-date'],
    ['shortReference', -1]
  ])('rejects an invalid %s field without leaking its value', (field, value) => {
    const fixture = orderFixture();
    fixture[field] = value;

    expect(() =>
      translateAnotaAiOrder(fixture, {
        pageId: 'page-1',
        moneyUnit: 'MAJOR'
      })
    ).toThrow(AnotaAiOrderTranslationError);
  });
});

function firstRecord(value: unknown, description: string): Record<string, unknown> {
  if (!Array.isArray(value) || typeof value[0] !== 'object' || value[0] === null) {
    throw new Error(`${description} missing`);
  }
  return value[0] as Record<string, unknown>;
}

function expectTranslationError(
  action: () => void,
  code: AnotaAiOrderTranslationError['code'],
  field?: string
): void {
  try {
    action();
  } catch (error: unknown) {
    if (!(error instanceof AnotaAiOrderTranslationError)) throw error;
    expect(error.code).toBe(code);
    if (field !== undefined) expect(error.field).toBe(field);
    return;
  }
  throw new Error('Expected AnotaAiOrderTranslationError.');
}
