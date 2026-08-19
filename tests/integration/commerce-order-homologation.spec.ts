import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { createDatabaseClient } from '@vero/infrastructure-database';
import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';
import { PaymentController } from '../../apps/api/src/menu/payment.controller';
import { PublicCheckoutController } from '../../apps/api/src/menu/public-checkout.controller';
import { PublicMenuController } from '../../apps/api/src/menu/public-menu.controller';
import { PublicOrderStatusController } from '../../apps/api/src/menu/public-order-status.controller';
import type { NativeOrderStatus } from '../../apps/api/src/menu/native-order.types';

type Database = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (transaction: Database) => Promise<T>): Promise<T>;
  $disconnect(): Promise<void>;
};

describe('Santo Parma VERO Menu application homologation', () => {
  const database = createDatabaseClient(required('VERO_DATABASE_URL')) as unknown as Database;
  const tenantId = `santo-parma-homolog-${randomUUID()}`;
  const otherTenantId = `other-tenant-homolog-${randomUUID()}`;
  const productId = randomUUID();
  const menuId = randomUUID();
  const categoryId = randomUUID();
  const menuItemId = randomUUID();
  const menuSlug = `santo-parma-homolog-${randomUUID()}`;
  const authorization = 'Bearer homologation-test';
  const authorize = jest.fn().mockResolvedValue(undefined);
  const publicMenu = new PublicMenuController(database);
  const checkout = new PublicCheckoutController(database);
  const payments = new PaymentController(database);
  const nativeOrders = new NativeOrderController(database);
  const tracking = new PublicOrderStatusController(database);
  const kitchen = new KitchenOrderController({ authorize } as never, database);

  beforeAll(async () => {
    await database.$executeRawUnsafe(
      `INSERT INTO catalog_products (
         id, "tenantId", name, "salePriceCents", "createdAt", "updatedAt"
       ) VALUES ($1::uuid, $2, $3, $4, NOW(), NOW())`,
      productId,
      tenantId,
      'Parmegiana Santo Parma Homologacao',
      4390
    );
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_menus (
         id, tenant_id, name, slug, published, created_at, updated_at
       ) VALUES ($1::uuid, $2, $3, $4, true, NOW(), NOW())`,
      menuId,
      tenantId,
      'Santo Parma Homologacao',
      menuSlug
    );
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_categories (
         id, tenant_id, menu_id, name, sort_order, active, created_at, updated_at
       ) VALUES ($1::uuid, $2, $3::uuid, $4, 0, true, NOW(), NOW())`,
      categoryId,
      tenantId,
      menuId,
      'Parmegianas'
    );
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_menu_items (
         id, tenant_id, menu_id, category_id, catalog_product_id, display_name,
         description, sale_price_cents, sort_order, active, available, featured,
         created_at, updated_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, 0, true, true,
         true, NOW(), NOW()
       )`,
      menuItemId,
      tenantId,
      menuId,
      categoryId,
      productId,
      'Parmegiana Homologacao',
      'Item exclusivo do gate de homologacao.',
      4590
    );
  });

  afterAll(async () => {
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_native_orders WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_menu_items WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_menu_categories WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_menus WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM catalog_products WHERE "tenantId" IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$disconnect();
  });

  it('publishes, prices, pays, persists, tracks, queues and prepares a VERO_NATIVE order', async () => {
    const menu = await publicMenu.getPublishedMenu(menuSlug);
    expect(menu).toMatchObject({
      id: menuId,
      slug: menuSlug,
      categories: [
        expect.objectContaining({
          id: categoryId,
          items: [
            expect.objectContaining({
              id: menuItemId,
              priceCents: 4590,
              available: true
            })
          ]
        })
      ]
    });

    const checkoutId = randomUUID();
    const browserDraft = {
      menuSlug,
      fulfillment: 'PICKUP' as const,
      customer: { name: 'Cliente Homologacao', phone: '67999999999' },
      address: null,
      items: [
        {
          menuItemId,
          quantity: 2,
          note: 'Sem cebola',
          unitPriceCents: 1,
          totalCents: 2
        }
      ]
    };
    const validated = await checkout.validate(browserDraft);
    expect(validated).toMatchObject({
      valid: true,
      itemsTotalCents: 9180,
      amountDueCents: 9180,
      items: [
        expect.objectContaining({
          menuItemId,
          quantity: 2,
          unitPriceCents: 4590,
          totalCents: 9180,
          note: 'Sem cebola'
        })
      ]
    });

    const browserPaymentRequest = {
      checkoutId,
      menuSlug,
      method: 'PAY_ON_DELIVERY' as const,
      customerName: browserDraft.customer.name,
      customerPhone: browserDraft.customer.phone,
      items: [{ menuItemId, quantity: 2, unitPriceCents: 1 }]
    };
    const payment = await payments.create(browserPaymentRequest);
    expect(payment).toMatchObject({
      method: 'PAY_ON_DELIVERY',
      status: 'PENDING',
      amountCents: 9180
    });

    const browserOrderRequest = {
      idempotencyKey: checkoutId,
      menuSlug,
      customer: browserDraft.customer,
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 2, note: 'Sem cebola', unitPriceCents: 1 }],
      payment: {
        method: payment.method,
        status: payment.status,
        paymentId: payment.paymentId
      }
    };
    const created = await nativeOrders.create(browserOrderRequest);
    expect(created).toMatchObject({
      provider: 'VERO_NATIVE',
      fulfillment: 'PICKUP',
      itemsTotalCents: 9180,
      totalCents: 9180,
      paymentMethod: 'PAY_ON_DELIVERY',
      paymentStatus: 'PENDING',
      status: 'RECEIVED',
      trackingToken: checkoutId
    });

    const persistedOrders = await database.$queryRawUnsafe<
      Array<{
        provider: string;
        tenantId: string;
        totalCents: number;
        status: string;
        trackingTokenHash: string;
        idempotencyKeyHash: string;
        serializedOrder: string;
      }>
    >(
      `SELECT provider, tenant_id AS "tenantId", total_cents AS "totalCents", status,
              tracking_token_hash AS "trackingTokenHash",
              idempotency_key_hash AS "idempotencyKeyHash",
              to_jsonb(commerce_native_orders)::text AS "serializedOrder"
         FROM commerce_native_orders
        WHERE id = $1::uuid`,
      created.orderId
    );
    const expectedTokenHash = createHash('sha256').update(checkoutId).digest('hex');
    expect(persistedOrders).toEqual([
      {
        provider: 'VERO_NATIVE',
        tenantId,
        totalCents: 9180,
        status: 'RECEIVED',
        trackingTokenHash: expectedTokenHash,
        idempotencyKeyHash: expectedTokenHash,
        serializedOrder: expect.any(String)
      }
    ]);
    expect(persistedOrders[0]?.serializedOrder).not.toContain(checkoutId);

    const persistedItems = await database.$queryRawUnsafe<
      Array<{ quantity: number; unitPriceCents: number; totalCents: number; note: string | null }>
    >(
      `SELECT quantity, unit_price_cents AS "unitPriceCents",
              total_cents AS "totalCents", note
         FROM commerce_native_order_items
        WHERE order_id = $1::uuid`,
      created.orderId
    );
    expect(persistedItems).toEqual([
      { quantity: 2, unitPriceCents: 4590, totalCents: 9180, note: 'Sem cebola' }
    ]);

    await expect(tracking.status(created.orderId, checkoutId)).resolves.toMatchObject({
      orderId: created.orderId,
      status: 'RECEIVED',
      paymentStatus: 'PENDING',
      fulfillment: 'PICKUP'
    });
    await expect(tracking.status(created.orderId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException
    );

    const queue = await kitchen.list(authorization, tenantId);
    expect(queue.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: created.orderId,
          status: 'RECEIVED',
          allowedTransitions: ['CONFIRMED', 'CANCELLED']
        })
      ])
    );
    const otherTenantQueue = await kitchen.list(authorization, otherTenantId);
    expect(otherTenantQueue.orders).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ orderId: created.orderId })])
    );
    await expect(
      kitchen.detail(authorization, otherTenantId, created.orderId)
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      kitchen.transition(authorization, otherTenantId, created.orderId, {
        status: 'CONFIRMED'
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      kitchen.transition(authorization, tenantId, created.orderId, { status: 'READY' })
    ).rejects.toThrow('INVALID_ORDER_TRANSITION:RECEIVED->READY');

    for (const status of ['CONFIRMED', 'PREPARING', 'READY'] as const) {
      const transitioned = await kitchen.transition(authorization, tenantId, created.orderId, {
        status
      });
      expect(transitioned.status).toBe(status);
      await expect(tracking.status(created.orderId, checkoutId)).resolves.toMatchObject({ status });
    }

    const ticket = await kitchen.detail(authorization, tenantId, created.orderId);
    expect(ticket).toMatchObject({
      order: {
        orderId: created.orderId,
        status: 'READY',
        allowedTransitions: ['COMPLETED', 'CANCELLED']
      },
      items: [
        expect.objectContaining({
          menuItemId,
          quantity: 2,
          unitPriceCents: 4590,
          note: 'Sem cebola'
        })
      ]
    });
    const history = ticket.history as Array<{
      fromStatus: NativeOrderStatus | null;
      toStatus: NativeOrderStatus;
    }>;
    expect(history.map(({ fromStatus, toStatus }) => ({ fromStatus, toStatus }))).toEqual([
      { fromStatus: null, toStatus: 'RECEIVED' },
      { fromStatus: 'RECEIVED', toStatus: 'CONFIRMED' },
      { fromStatus: 'CONFIRMED', toStatus: 'PREPARING' },
      { fromStatus: 'PREPARING', toStatus: 'READY' }
    ]);
    await expect(
      kitchen.transition(authorization, tenantId, created.orderId, { status: 'DISPATCHED' })
    ).rejects.toThrow('INVALID_ORDER_TRANSITION:READY->DISPATCHED');
    expect(authorize).toHaveBeenCalledWith(authorization, tenantId, 'orders.kitchen.list');
    expect(authorize).toHaveBeenCalledWith(authorization, tenantId, 'orders.kitchen.transition');
  });

  it('rejects unavailable items in checkout and native order creation', async () => {
    await database.$executeRawUnsafe(
      'UPDATE commerce_menu_items SET available = false WHERE tenant_id = $1 AND id = $2::uuid',
      tenantId,
      menuItemId
    );
    try {
      const unavailableDraft = {
        menuSlug,
        fulfillment: 'PICKUP' as const,
        customer: { name: 'Cliente Item Indisponivel', phone: '67999999998' },
        address: null,
        items: [{ menuItemId, quantity: 1 }]
      };
      await expect(checkout.validate(unavailableDraft)).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        nativeOrders.create({
          idempotencyKey: randomUUID(),
          menuSlug,
          customer: unavailableDraft.customer,
          fulfillment: 'PICKUP',
          items: unavailableDraft.items,
          payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' }
        })
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      await database.$executeRawUnsafe(
        'UPDATE commerce_menu_items SET available = true WHERE tenant_id = $1 AND id = $2::uuid',
        tenantId,
        menuItemId
      );
    }
  });

  it('returns coherent errors for nonexistent orders', async () => {
    const nonexistentOrderId = randomUUID();
    await expect(tracking.status(nonexistentOrderId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException
    );
    await expect(
      kitchen.detail(authorization, tenantId, nonexistentOrderId)
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      kitchen.transition(authorization, tenantId, nonexistentOrderId, { status: 'CONFIRMED' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for integration tests.`);
  return value;
}
