import type { ExternalOrder } from './external-order.js';
import {
  ExternalCatalogLinkError,
  resolveExternalOrderCatalog,
  type ExternalCatalogLink
} from './external-catalog-link.js';

function orderFixture(): ExternalOrder {
  return {
    currency: 'BRL',
    identity: {
      provider: 'ANOTA_AI',
      establishmentExternalId: 'page-1',
      orderExternalId: 'order-1',
      idempotencyKey: 'anota-ai:key',
      reference: '42'
    },
    merchant: { externalId: 'merchant-1', name: 'O Santo Parma', unit: 'Matriz' },
    source: {
      salesChannel: 'ANOTA_AI',
      origin: 'DELIVERY',
      type: 'DELIVERY',
      menuVersion: 1
    },
    createdAt: '2026-07-29T12:00:00.000Z',
    updatedAt: '2026-07-29T12:01:00.000Z',
    items: [
      {
        providerItemId: '10',
        name: 'Item',
        quantity: 1,
        unitPriceCents: 4_190,
        totalCents: 4_690,
        modifiers: [
          {
            providerItemId: '11',
            parentProviderItemId: '10',
            name: 'Modifier',
            quantity: 1,
            unitPriceCents: 500,
            totalCents: 500
          }
        ]
      }
    ],
    discounts: [],
    deliveryFeeCents: 0,
    additionalFeesCents: [],
    payments: [],
    totalCents: 4_690,
    customer: {}
  };
}

function link(
  kind: ExternalCatalogLink['kind'],
  providerItemId: string,
  catalogProductId: string
): ExternalCatalogLink {
  return {
    tenantId: 'tenant-1',
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-1',
    kind,
    providerItemId,
    catalogProductId
  };
}

describe('resolveExternalOrderCatalog', () => {
  it('resolves products and modifiers only through explicit tenant-scoped links', () => {
    const resolution = resolveExternalOrderCatalog('tenant-1', orderFixture(), [
      link('ITEM', '10', 'product-parmegiana'),
      link('MODIFIER', '11', 'product-puree')
    ]);

    expect(resolution).toEqual({
      tenantId: 'tenant-1',
      ready: true,
      resolved: [
        { kind: 'ITEM', providerItemId: '10', catalogProductId: 'product-parmegiana' },
        { kind: 'MODIFIER', providerItemId: '11', catalogProductId: 'product-puree' }
      ],
      unresolved: []
    });
    expect(Object.isFrozen(resolution.resolved)).toBe(true);
  });

  it('reports missing links without creating or guessing catalog products', () => {
    const resolution = resolveExternalOrderCatalog('tenant-1', orderFixture(), [
      link('ITEM', '10', 'product-parmegiana')
    ]);

    expect(resolution.ready).toBe(false);
    expect(resolution.resolved).toEqual([
      { kind: 'ITEM', providerItemId: '10', catalogProductId: 'product-parmegiana' }
    ]);
    expect(resolution.unresolved).toEqual([{ kind: 'MODIFIER', providerItemId: '11' }]);
  });

  it('deduplicates repeated order references while preserving their kinds', () => {
    const order = orderFixture();
    const repeated: ExternalOrder = {
      ...order,
      items: [...order.items, order.items[0]!]
    };

    const resolution = resolveExternalOrderCatalog('tenant-1', repeated, []);

    expect(resolution.unresolved).toEqual([
      { kind: 'ITEM', providerItemId: '10' },
      { kind: 'MODIFIER', providerItemId: '11' }
    ]);
  });

  it('rejects links from another tenant or establishment', () => {
    expectLinkError(
      () =>
        resolveExternalOrderCatalog('tenant-1', orderFixture(), [
          { ...link('ITEM', '10', 'product-parmegiana'), tenantId: 'tenant-2' }
        ]),
      'SCOPE_MISMATCH'
    );
    expectLinkError(
      () =>
        resolveExternalOrderCatalog('tenant-1', orderFixture(), [
          {
            ...link('ITEM', '10', 'product-parmegiana'),
            establishmentExternalId: 'page-2'
          }
        ]),
      'SCOPE_MISMATCH'
    );
  });

  it('rejects duplicate links for the same provider reference', () => {
    expectLinkError(
      () =>
        resolveExternalOrderCatalog('tenant-1', orderFixture(), [
          link('ITEM', '10', 'product-a'),
          link('ITEM', '10', 'product-b')
        ]),
      'DUPLICATE_LINK'
    );
  });
});

function expectLinkError(action: () => void, code: ExternalCatalogLinkError['code']): void {
  try {
    action();
  } catch (error: unknown) {
    if (!(error instanceof ExternalCatalogLinkError)) throw error;
    expect(error.code).toBe(code);
    return;
  }
  throw new Error('Expected ExternalCatalogLinkError.');
}
