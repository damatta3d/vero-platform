import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { createDatabaseClient } from '@vero/infrastructure-database';
import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';
import { MenuAdminController } from '../../apps/api/src/menu/menu-admin.controller';
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
  const menuAdmin = new MenuAdminController(database, { authorize } as never);

  async function setAvailability(
    operationallyOpen: boolean,
    withinSchedule: boolean,
    boundary?: 'OPEN' | 'CLOSE',
    target: Database = database
  ) {
    const timestamps = await target.$queryRawUnsafe<Array<{ now: Date }>>(
      'SELECT CURRENT_TIMESTAMP AS now'
    );
    const now = new Date(timestamps[0]!.now);
    const candidates = ['America/Campo_Grande', 'UTC', 'Pacific/Kiritimati'];
    const details = candidates.map((timezone) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(now);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return {
        currentMinute: Number(values['hour']) * 60 + Number(values['minute']),
        timezone,
        weekday: values['weekday'] ?? ''
      };
    });
    const selected =
      details.find(({ currentMinute }) => currentMinute > 60 && currentMinute < 1379) ??
      details[0]!;
    const timezone = selected.timezone;
    const local = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now);
    const value = Object.fromEntries(local.map((part) => [part.type, part.value]));
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
      value['weekday'] ?? ''
    );
    const currentMinute = Number(value['hour']) * 60 + Number(value['minute']);
    const opensMinute = Math.max(0, currentMinute - 60);
    const closesMinute = Math.min(1439, Math.max(currentMinute + 60, 1));
    const clock = (minute: number) =>
      `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

    await target.$executeRawUnsafe(
      `UPDATE store_settings
          SET operationally_open=$2, timezone=$3
        WHERE tenant_id=$1`,
      tenantId,
      operationallyOpen,
      timezone
    );
    await target.$executeRawUnsafe(
      'DELETE FROM store_schedule_windows WHERE tenant_id=$1',
      tenantId
    );
    for (let day = 0; day < 7; day += 1) {
      const enabled = (withinSchedule || boundary === 'CLOSE') && day === weekday;
      const opensAt = boundary === 'OPEN' ? currentMinute : opensMinute;
      const closesAt = boundary === 'CLOSE' ? currentMinute : closesMinute;
      await target.$executeRawUnsafe(
        `INSERT INTO store_schedule_windows
           (tenant_id, weekday, sequence, enabled, opens_at, closes_at)
         VALUES ($1, $2, 0, $3, $4::time, $5::time)`,
        tenantId,
        day,
        enabled,
        enabled ? clock(opensAt) : '09:00',
        enabled ? clock(closesAt) : '18:00'
      );
    }
  }

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
    await database.$executeRawUnsafe(
      `INSERT INTO store_settings
         (tenant_id, display_name, order_receipt_mode, operationally_open, timezone)
       VALUES ($1, $2, 'MANUAL', true, 'America/Campo_Grande')
       ON CONFLICT (tenant_id) DO UPDATE
         SET order_receipt_mode='MANUAL', operationally_open=true,
             timezone='America/Campo_Grande'`,
      tenantId,
      'Santo Parma Homologacao'
    );
    await setAvailability(true, true);
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
    await database.$executeRawUnsafe(
      'DELETE FROM store_settings WHERE tenant_id IN ($1, $2)',
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
      orderNote: 'Tocar a campainha',
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
      address: browserDraft.address,
      orderNote: browserDraft.orderNote,
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
      trackingToken: checkoutId,
      orderNumber: expect.stringMatching(/^\d{5}$/)
    });

    const persistedOrders = await database.$queryRawUnsafe<
      Array<{
        provider: string;
        tenantId: string;
        totalCents: number;
        status: string;
        trackingTokenHash: string;
        idempotencyKeyHash: string;
        operationalNumber: number;
        orderNote: string | null;
        deliveryAddress: unknown;
        serializedOrder: string;
      }>
    >(
      `SELECT provider, tenant_id AS "tenantId", total_cents AS "totalCents", status,
              tracking_token_hash AS "trackingTokenHash",
              idempotency_key_hash AS "idempotencyKeyHash",
              operational_number AS "operationalNumber",
              order_note AS "orderNote",
              delivery_address AS "deliveryAddress",
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
        operationalNumber: Number(created.orderNumber),
        orderNote: 'Tocar a campainha',
        deliveryAddress: null,
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
      fulfillment: 'PICKUP',
      orderNumber: created.orderNumber,
      orderNote: 'Tocar a campainha',
      items: [expect.objectContaining({ name: 'Parmegiana Homologacao', note: 'Sem cebola' })]
    });
    await expect(tracking.status(created.orderId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException
    );

    const queue = await kitchen.list(authorization, tenantId);
    expect(queue.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: created.orderId,
          orderNumber: created.orderNumber,
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
        orderNumber: created.orderNumber,
        orderNote: 'Tocar a campainha',
        deliveryAddress: null,
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
    const confirmationAudit = await database.$queryRawUnsafe<
      Array<{ source: string | null; confirmedAt: Date | null }>
    >(
      `SELECT confirmed_source AS source, confirmed_at AS "confirmedAt"
       FROM commerce_native_orders WHERE id=$1::uuid`,
      created.orderId
    );
    expect(confirmationAudit[0]).toEqual({ source: 'MANUAL', confirmedAt: expect.any(Date) });
    await expect(
      kitchen.transition(authorization, tenantId, created.orderId, { status: 'DISPATCHED' })
    ).rejects.toThrow('INVALID_ORDER_TRANSITION:READY->DISPATCHED');
    expect(authorize).toHaveBeenCalledWith(authorization, tenantId, 'orders.kitchen.list');
    expect(authorize).toHaveBeenCalledWith(authorization, tenantId, 'orders.kitchen.transition');
  });

  it.each([
    { manual: true, within: true, accepted: true },
    { manual: true, within: false, accepted: false },
    { manual: false, within: true, accepted: false },
    { manual: false, within: false, accepted: false }
  ])(
    'enforces manual=$manual and withinSchedule=$within at checkout',
    async ({ manual, within, accepted }) => {
      await setAvailability(manual, within);
      const request = {
        menuSlug,
        fulfillment: 'PICKUP' as const,
        customer: { name: 'Cliente Horario', phone: '67999999996' },
        address: null,
        items: [{ menuItemId, quantity: 1 }]
      };

      if (accepted) {
        await expect(checkout.validate(request)).resolves.toMatchObject({ valid: true });
      } else {
        await expect(checkout.validate(request)).rejects.toBeInstanceOf(ConflictException);
      }
    }
  );

  it('accepts at the exact opening minute and rejects at the exact closing minute', async () => {
    const request = {
      menuSlug,
      fulfillment: 'PICKUP' as const,
      customer: { name: 'Cliente Limite', phone: '67999999994' },
      address: null,
      items: [{ menuItemId, quantity: 1 }]
    };

    await database.$transaction(async (transaction) => {
      await setAvailability(true, true, 'OPEN', transaction);
      const transactionCheckout = new PublicCheckoutController(transaction);
      await expect(transactionCheckout.validate(request)).resolves.toMatchObject({ valid: true });
    });
    await database.$transaction(async (transaction) => {
      await setAvailability(true, false, 'CLOSE', transaction);
      const transactionCheckout = new PublicCheckoutController(transaction);
      await expect(transactionCheckout.validate(request)).rejects.toBeInstanceOf(ConflictException);
    });
    await setAvailability(true, true);
  });

  it('revalidates store availability in the final order transaction', async () => {
    await setAvailability(true, false);
    const request = {
      idempotencyKey: randomUUID(),
      menuSlug,
      customer: { name: 'Cliente Loja Fechada', phone: '67999999995' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }],
      payment: { method: 'PAY_ON_DELIVERY' as const, status: 'PENDING' as const }
    };

    await expect(nativeOrders.create(request)).rejects.toBeInstanceOf(ConflictException);
    const persisted = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM commerce_native_orders
       WHERE tenant_id=$1 AND customer_phone=$2`,
      tenantId,
      request.customer.phone
    );
    expect(persisted[0]?.count).toBe(0n);
    await setAvailability(true, true);
  });

  it('allocates unique persistent five-digit numbers under concurrent creation', async () => {
    await setAvailability(true, true);
    const orders = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        nativeOrders.create({
          idempotencyKey: randomUUID(),
          menuSlug,
          customer: { name: `Cliente Concorrente ${index}`, phone: `6799999998${index}` },
          fulfillment: 'PICKUP',
          items: [{ menuItemId, quantity: 1 }],
          payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' }
        })
      )
    );
    const numbers = orders.map((order) => order.orderNumber);

    expect(numbers).toHaveLength(new Set(numbers).size);
    expect(numbers).toEqual(numbers.map(() => expect.stringMatching(/^\d{5}$/)));
    const persisted = await database.$queryRawUnsafe<Array<{ operationalNumber: number }>>(
      `SELECT operational_number AS "operationalNumber"
       FROM commerce_native_orders
       WHERE id=ANY($1::uuid[])`,
      orders.map((order) => order.orderId)
    );
    expect(persisted.map(({ operationalNumber }) => operationalNumber).sort()).toEqual(
      numbers.map(Number).sort((left, right) => left - right)
    );
  });

  it('rejects unavailable items in checkout and native order creation', async () => {
    await database.$executeRawUnsafe(
      `UPDATE store_settings SET order_receipt_mode='AUTOMATIC' WHERE tenant_id=$1`,
      tenantId
    );
    await database.$executeRawUnsafe(
      'UPDATE commerce_menu_items SET available = false WHERE tenant_id = $1 AND id = $2::uuid',
      tenantId,
      menuItemId
    );
    try {
      const publicPaused = await publicMenu.getPublishedMenu(menuSlug);
      expect(publicPaused.categories).toEqual([]);
      const managerMenu = await menuAdmin.detail(authorization, tenantId, menuId);
      expect(managerMenu.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: menuItemId, available: false })])
      );
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
      const rejectedOrders = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) AS count FROM commerce_native_orders
         WHERE tenant_id=$1 AND customer_phone='67999999998'`,
        tenantId
      );
      expect(rejectedOrders[0]?.count).toBe(0n);
    } finally {
      await database.$executeRawUnsafe(
        'UPDATE commerce_menu_items SET available = true WHERE tenant_id = $1 AND id = $2::uuid',
        tenantId,
        menuItemId
      );
      await database.$executeRawUnsafe(
        `UPDATE store_settings SET order_receipt_mode='MANUAL' WHERE tenant_id=$1`,
        tenantId
      );
    }
    const publicReactivated = await publicMenu.getPublishedMenu(menuSlug);
    expect(publicReactivated.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
          items: expect.arrayContaining([expect.objectContaining({ id: menuItemId })])
        })
      ])
    );
  });

  it('confirms only new orders automatically and keeps retries idempotent', async () => {
    const manualKey = randomUUID();
    const manualRequest = {
      idempotencyKey: manualKey,
      menuSlug,
      customer: { name: 'Cliente Manual', phone: '67999999991' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }],
      payment: { method: 'PAY_ON_DELIVERY' as const, status: 'PENDING' as const }
    };
    const manual = await nativeOrders.create(manualRequest);
    expect(manual.status).toBe('RECEIVED');

    await database.$executeRawUnsafe(
      `UPDATE store_settings SET order_receipt_mode='AUTOMATIC' WHERE tenant_id=$1`,
      tenantId
    );
    const unchanged = await database.$queryRawUnsafe<Array<{ status: string }>>(
      'SELECT status FROM commerce_native_orders WHERE id=$1::uuid',
      manual.orderId
    );
    expect(unchanged[0]?.status).toBe('RECEIVED');

    const automaticRequest = {
      ...manualRequest,
      idempotencyKey: randomUUID(),
      customer: { name: 'Cliente Automatico', phone: '67999999992' }
    };
    const automatic = await nativeOrders.create(automaticRequest);
    expect(automatic.status).toBe('CONFIRMED');
    const retry = await nativeOrders.create(automaticRequest);
    expect(retry).toMatchObject({ orderId: automatic.orderId, status: 'CONFIRMED' });

    const persisted = await database.$queryRawUnsafe<
      Array<{ status: string; source: string | null; confirmedAt: Date | null }>
    >(
      `SELECT status, confirmed_source AS source, confirmed_at AS "confirmedAt"
       FROM commerce_native_orders WHERE id=$1::uuid`,
      automatic.orderId
    );
    expect(persisted[0]).toEqual({
      status: 'CONFIRMED',
      source: 'AUTO',
      confirmedAt: expect.any(Date)
    });
    const automaticHistory = await database.$queryRawUnsafe<Array<{ toStatus: string }>>(
      `SELECT to_status AS "toStatus" FROM commerce_native_order_status_history
       WHERE order_id=$1::uuid ORDER BY occurred_at`,
      automatic.orderId
    );
    expect(automaticHistory).toEqual([{ toStatus: 'RECEIVED' }, { toStatus: 'CONFIRMED' }]);
  });

  it('keeps a persisted order RECEIVED when automatic confirmation fails', async () => {
    class FailingAutomaticOrderController extends NativeOrderController {
      protected override confirmAutomatically(_tenantId: string, _orderId: string) {
        return Promise.reject(new Error('simulated automatic confirmation failure'));
      }
    }
    const controller = new FailingAutomaticOrderController(database);
    const request = {
      idempotencyKey: randomUUID(),
      menuSlug,
      customer: { name: 'Cliente Fallback', phone: '67999999993' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }],
      payment: { method: 'PAY_ON_DELIVERY' as const, status: 'PENDING' as const }
    };
    const created = await controller.create(request);
    expect(created.status).toBe('RECEIVED');
    await expect(controller.create(request)).resolves.toMatchObject({
      orderId: created.orderId,
      status: 'RECEIVED'
    });
    const queue = await kitchen.list(authorization, tenantId);
    expect(queue.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orderId: created.orderId, status: 'RECEIVED' })
      ])
    );
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
