import { createHash, createHmac, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { createDatabaseClient } from '@vero/infrastructure-database';
import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';
import { MenuAdminController } from '../../apps/api/src/menu/menu-admin.controller';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';
import { PaymentController } from '../../apps/api/src/menu/payment.controller';
import { PaymentWebhookController } from '../../apps/api/src/menu/payment-webhook.controller';
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
  const paymentWebhooks = new PaymentWebhookController(database);
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

  async function createPayOnDeliveryPayment(request: {
    idempotencyKey: string;
    menuSlug: string;
    couponCode?: string;
    customer: { name: string; phone: string; email?: string };
    fulfillment: 'DELIVERY' | 'PICKUP';
    address?: {
      street: string;
      number: string;
      district: string;
      postalCode?: string;
      complement?: string;
      reference?: string;
    } | null;
    orderNote?: string;
    items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  }) {
    return payments.create({
      checkoutId: request.idempotencyKey,
      menuSlug: request.menuSlug,
      method: 'PAY_ON_DELIVERY',
      customer: request.customer,
      fulfillment: request.fulfillment,
      address: request.address ?? null,
      items: request.items,
      ...(request.couponCode === undefined ? {} : { couponCode: request.couponCode }),
      ...(request.orderNote === undefined ? {} : { orderNote: request.orderNote })
    });
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
         (tenant_id, display_name, order_receipt_mode, operationally_open, timezone,
          delivery_enabled, delivery_base_fee_cents)
       VALUES ($1, $2, 'MANUAL', true, 'America/Campo_Grande', true, 0)
       ON CONFLICT (tenant_id) DO UPDATE
         SET order_receipt_mode='MANUAL', operationally_open=true,
             timezone='America/Campo_Grande',delivery_enabled=true,delivery_base_fee_cents=0`,
      tenantId,
      'Santo Parma Homologacao'
    );
    await setAvailability(true, true);
  });

  afterAll(async () => {
    await database.$executeRawUnsafe(
      `DELETE FROM commerce_payment_webhook_inbox
        WHERE provider_order_id IN (
          SELECT provider_order_id FROM commerce_payment_attempts
           WHERE tenant_id IN ($1, $2) AND provider_order_id IS NOT NULL
        )`,
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_native_orders WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_payment_attempts WHERE tenant_id IN ($1, $2)',
      tenantId,
      otherTenantId
    );
    await database.$executeRawUnsafe(
      'DELETE FROM commerce_coupons WHERE tenant_id IN ($1, $2)',
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

    const payment = await createPayOnDeliveryPayment({
      idempotencyKey: checkoutId,
      ...browserDraft
    });
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
      itemsTotalCents: 9180,
      discountCents: 0,
      totalCents: 9180,
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
    await expect(
      kitchen.receivePayment(authorization, tenantId, created.orderId, { status: 'PAID' })
    ).resolves.toEqual({ orderId: created.orderId, paymentStatus: 'PAID' });
    await expect(
      kitchen.receivePayment(authorization, tenantId, created.orderId, { status: 'PAID' })
    ).resolves.toEqual({ orderId: created.orderId, paymentStatus: 'PAID' });
    await expect(tracking.status(created.orderId, checkoutId)).resolves.toMatchObject({
      paymentStatus: 'PAID'
    });
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
    expect(authorize).toHaveBeenCalledWith(authorization, tenantId, 'orders.payment.receive');
  });

  it('rejects attempts from another checkout, amount or tenant', async () => {
    await setAvailability(true, true);
    const original = {
      idempotencyKey: randomUUID(),
      menuSlug,
      customer: { name: 'Cliente Integridade', phone: '67995550001' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    };
    const payment = await createPayOnDeliveryPayment(original);

    await expect(
      nativeOrders.create({
        ...original,
        idempotencyKey: randomUUID(),
        payment: { method: payment.method, paymentId: payment.paymentId }
      })
    ).rejects.toThrow('O pagamento não pertence a este checkout');
    await expect(
      nativeOrders.create({
        ...original,
        items: [{ menuItemId, quantity: 2 }],
        payment: { method: payment.method, paymentId: payment.paymentId }
      })
    ).rejects.toThrow('O pagamento não pertence a este checkout');

    const foreignPaymentId = randomUUID();
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_payment_attempts
         (id,tenant_id,checkout_key_hash,request_hash,provider,external_reference,
          method,amount_cents,currency,status)
       VALUES ($1::uuid,$2,$3,$4,'VERO',$5,'PAY_ON_DELIVERY',4590,'BRL','PENDING')`,
      foreignPaymentId,
      otherTenantId,
      createHash('sha256').update(original.idempotencyKey).digest('hex'),
      '0'.repeat(64),
      `vero_${foreignPaymentId.replaceAll('-', '')}`
    );
    await expect(
      nativeOrders.create({
        ...original,
        payment: { method: 'PAY_ON_DELIVERY', paymentId: foreignPaymentId }
      })
    ).rejects.toThrow('O pagamento não pertence a este checkout');
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
    await setAvailability(true, true);
    const draft = {
      idempotencyKey: randomUUID(),
      menuSlug,
      customer: { name: 'Cliente Loja Fechada', phone: '67999999995' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    };
    const payment = await createPayOnDeliveryPayment(draft);
    await setAvailability(true, false);
    const request = {
      ...draft,
      payment: { method: payment.method, paymentId: payment.paymentId }
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
    const requests = Array.from({ length: 6 }, (_, index) => ({
      idempotencyKey: randomUUID(),
      menuSlug,
      customer: { name: `Cliente Concorrente ${index}`, phone: `6799999998${index}` },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    }));
    const paymentAttempts = await Promise.all(requests.map(createPayOnDeliveryPayment));
    const orders = await Promise.all(
      requests.map((request, index) =>
        nativeOrders.create({
          ...request,
          payment: {
            method: paymentAttempts[index]!.method,
            paymentId: paymentAttempts[index]!.paymentId
          }
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
          payment: { method: 'PAY_ON_DELIVERY', paymentId: randomUUID() }
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
      items: [{ menuItemId, quantity: 1 }]
    };
    const manualPayment = await createPayOnDeliveryPayment(manualRequest);
    const manual = await nativeOrders.create({
      ...manualRequest,
      payment: { method: manualPayment.method, paymentId: manualPayment.paymentId }
    });
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
    const automaticPayment = await createPayOnDeliveryPayment(automaticRequest);
    const automaticOrderRequest = {
      ...automaticRequest,
      payment: { method: automaticPayment.method, paymentId: automaticPayment.paymentId }
    };
    const automatic = await nativeOrders.create(automaticOrderRequest);
    expect(automatic.status).toBe('CONFIRMED');
    const retry = await nativeOrders.create(automaticOrderRequest);
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
      items: [{ menuItemId, quantity: 1 }]
    };
    const payment = await createPayOnDeliveryPayment(request);
    const orderRequest = {
      ...request,
      payment: { method: payment.method, paymentId: payment.paymentId }
    };
    const created = await controller.create(orderRequest);
    expect(created.status).toBe('RECEIVED');
    await expect(controller.create(orderRequest)).resolves.toMatchObject({
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

  it('creates one PIX attempt, rejects browser status fraud and reconciles webhook safely', async () => {
    await setAvailability(true, true);
    await database.$executeRawUnsafe(
      `UPDATE store_settings
          SET order_receipt_mode='AUTOMATIC',delivery_enabled=true,delivery_base_fee_cents=1000,
              free_delivery_above_cents=NULL
        WHERE tenant_id=$1`,
      tenantId
    );
    const couponId = randomUUID();
    const couponCode = `PIX${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_coupons
         (id,tenant_id,code,name,discount_type,discount_value,active,max_uses)
       VALUES ($1::uuid,$2,$3,'PIX 10','PERCENTAGE',10,true,1)`,
      couponId,
      tenantId,
      couponCode
    );
    const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const oldSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'integration-access-token';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'integration-webhook-secret';
    const providerOrderId = `ORD${randomUUID().replaceAll('-', '')}`;
    const providerPaymentId = `PAY${randomUUID().replaceAll('-', '')}`;
    let providerStatus = 'action_required';
    let providerStatusDetail = 'waiting_transfer';
    let externalReference = '';
    let providerAmount = '';
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url, init) => {
      if (String(url) === 'https://api.mercadopago.com/v1/orders' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          external_reference: string;
          total_amount: string;
        };
        externalReference = body.external_reference;
        providerAmount = body.total_amount;
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: providerOrderId,
            total_amount: providerAmount,
            external_reference: externalReference,
            transactions: {
              payments: [
                {
                  id: providerPaymentId,
                  status: providerStatus,
                  status_detail: providerStatusDetail,
                  amount: providerAmount,
                  payment_method: {
                    id: 'pix',
                    type: 'bank_transfer',
                    qr_code: '000201PIX-INTEGRATION',
                    qr_code_base64: 'cXItY29kZQ=='
                  }
                }
              ]
            }
          })
      } as Response);
    });
    const idempotencyKey = randomUUID();
    const draft = {
      menuSlug,
      couponCode,
      customer: {
        name: 'Cliente PIX',
        phone: '67992220001',
        email: 'cliente.pix@example.com'
      },
      fulfillment: 'DELIVERY' as const,
      address: { street: 'Rua PIX', number: '10', district: 'Centro' },
      orderNote: 'Entregar na recepção',
      items: [{ menuItemId, quantity: 1, note: 'Sem cebola' }]
    };

    try {
      const [firstPayment, concurrentRetry] = await Promise.all([
        payments.create({ checkoutId: idempotencyKey, method: 'PIX', ...draft }),
        payments.create({ checkoutId: idempotencyKey, method: 'PIX', ...draft })
      ]);
      expect(firstPayment).toMatchObject({
        amountCents: 5131,
        method: 'PIX',
        status: 'AWAITING_PAYMENT',
        pixCopyPaste: '000201PIX-INTEGRATION',
        qrCodeUrl: 'data:image/png;base64,cXItY29kZQ=='
      });
      expect(concurrentRetry.paymentId).toBe(firstPayment.paymentId);
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) =>
            String(url) === 'https://api.mercadopago.com/v1/orders' && init?.method === 'POST'
        )
      ).toHaveLength(1);

      await expect(
        nativeOrders.create({
          idempotencyKey,
          ...draft,
          payment: {
            method: 'PIX',
            paymentId: firstPayment.paymentId,
            status: 'PAID'
          }
        })
      ).rejects.toThrow('A situação do pagamento é definida exclusivamente pelo servidor.');

      const created = await nativeOrders.create({
        idempotencyKey,
        ...draft,
        payment: { method: 'PIX', paymentId: firstPayment.paymentId }
      });
      expect(created).toMatchObject({
        itemsTotalCents: 4590,
        discountCents: 459,
        deliveryFeeCents: 1000,
        totalCents: 5131,
        paymentStatus: 'AWAITING_PAYMENT',
        status: 'RECEIVED',
        orderNumber: expect.stringMatching(/^\d{5}$/)
      });
      const pendingQueue = await kitchen.list(authorization, tenantId);
      expect(pendingQueue.orders).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ orderId: created.orderId })])
      );

      providerStatus = 'processed';
      providerStatusDetail = 'accredited';
      const requestId = `webhook-${randomUUID()}`;
      const ts = '1787335200';
      const digest = createHmac('sha256', 'integration-webhook-secret')
        .update(`id:${providerOrderId};request-id:${requestId};ts:${ts};`)
        .digest('hex');
      const signature = `ts=${ts},v1=${digest}`;
      await expect(
        paymentWebhooks.receive(
          { type: 'order', action: 'order.processed', data: { id: providerOrderId } },
          providerOrderId,
          signature,
          requestId
        )
      ).resolves.toMatchObject({ changed: true, paymentStatus: 'PAID', reconciled: true });
      await expect(
        paymentWebhooks.receive(
          { type: 'order', action: 'order.processed', data: { id: providerOrderId } },
          providerOrderId,
          signature,
          requestId
        )
      ).resolves.toMatchObject({ changed: false, paymentStatus: 'PAID' });

      providerStatus = 'action_required';
      providerStatusDetail = 'waiting_transfer';
      const delayedRequestId = `webhook-${randomUUID()}`;
      const delayedDigest = createHmac('sha256', 'integration-webhook-secret')
        .update(`id:${providerOrderId};request-id:${delayedRequestId};ts:${ts};`)
        .digest('hex');
      await expect(
        paymentWebhooks.receive(
          { type: 'order', action: 'order.action_required', data: { id: providerOrderId } },
          providerOrderId,
          `ts=${ts},v1=${delayedDigest}`,
          delayedRequestId
        )
      ).resolves.toMatchObject({ changed: false, paymentStatus: 'PAID' });

      await expect(tracking.status(created.orderId, idempotencyKey)).resolves.toMatchObject({
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        itemsTotalCents: 4590,
        discountCents: 459,
        deliveryFeeCents: 1000,
        totalCents: 5131
      });
      await expect(kitchen.detail(authorization, tenantId, created.orderId)).resolves.toMatchObject(
        {
          order: { paymentStatus: 'PAID', status: 'CONFIRMED', couponCode }
        }
      );
      const [usage] = await database.$queryRawUnsafe<Array<{ usesCount: number }>>(
        `SELECT uses_count AS "usesCount" FROM commerce_coupons WHERE id=$1::uuid`,
        couponId
      );
      expect(usage?.usesCount).toBe(1);
      const [webhookTransitions] = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) AS count FROM commerce_payment_status_history
          WHERE payment_id=$1::uuid AND source='WEBHOOK'`,
        firstPayment.paymentId
      );
      expect(webhookTransitions?.count).toBe(1n);
    } finally {
      fetchMock.mockRestore();
      if (oldToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      else process.env.MERCADO_PAGO_ACCESS_TOKEN = oldToken;
      if (oldSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      else process.env.MERCADO_PAGO_WEBHOOK_SECRET = oldSecret;
      await database.$executeRawUnsafe(
        `UPDATE store_settings
            SET order_receipt_mode='MANUAL',delivery_base_fee_cents=0
          WHERE tenant_id=$1`,
        tenantId
      );
    }
  });

  it('reconciles a paid webhook before the order exists and uses that server status later', async () => {
    await setAvailability(true, true);
    await database.$executeRawUnsafe(
      `UPDATE store_settings SET order_receipt_mode='AUTOMATIC' WHERE tenant_id=$1`,
      tenantId
    );
    const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const oldSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'integration-access-token';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'integration-webhook-secret';
    const providerOrderId = `ORD${randomUUID().replaceAll('-', '')}`;
    const providerPaymentId = `PAY${randomUUID().replaceAll('-', '')}`;
    let externalReference = '';
    let providerAmount = '';
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url, init) => {
      const creating = String(url) === 'https://api.mercadopago.com/v1/orders';
      if (creating) {
        const body = JSON.parse(String(init?.body)) as {
          external_reference: string;
          total_amount: string;
        };
        externalReference = body.external_reference;
        providerAmount = body.total_amount;
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: providerOrderId,
            total_amount: providerAmount,
            external_reference: externalReference,
            transactions: {
              payments: [
                {
                  id: providerPaymentId,
                  status: creating ? 'action_required' : 'processed',
                  status_detail: creating ? 'waiting_transfer' : 'accredited',
                  amount: providerAmount,
                  payment_method: {
                    id: 'pix',
                    type: 'bank_transfer',
                    qr_code: '000201PIX-BEFORE-ORDER',
                    qr_code_base64: 'cXItYmVmb3JlLW9yZGVy'
                  }
                }
              ]
            }
          })
      } as Response);
    });
    const idempotencyKey = randomUUID();
    const draft = {
      menuSlug,
      customer: {
        name: 'Cliente Webhook Primeiro',
        phone: '67992220002',
        email: 'webhook.primeiro@example.com'
      },
      fulfillment: 'PICKUP' as const,
      address: null,
      items: [{ menuItemId, quantity: 1 }]
    };

    try {
      const payment = await payments.create({
        checkoutId: idempotencyKey,
        method: 'PIX',
        ...draft
      });
      expect(payment.status).toBe('AWAITING_PAYMENT');

      const requestId = `webhook-${randomUUID()}`;
      const ts = '1787335201';
      const digest = createHmac('sha256', 'integration-webhook-secret')
        .update(`id:${providerOrderId};request-id:${requestId};ts:${ts};`)
        .digest('hex');
      await expect(
        paymentWebhooks.receive(
          { type: 'order', action: 'order.processed', data: { id: providerOrderId } },
          providerOrderId,
          `ts=${ts},v1=${digest}`,
          requestId
        )
      ).resolves.toMatchObject({ changed: true, paymentStatus: 'PAID' });

      const created = await nativeOrders.create({
        idempotencyKey,
        ...draft,
        payment: { method: 'PIX', paymentId: payment.paymentId }
      });
      expect(created).toMatchObject({ paymentStatus: 'PAID', status: 'CONFIRMED' });
      const queue = await kitchen.list(authorization, tenantId);
      expect(queue.orders).toEqual(
        expect.arrayContaining([expect.objectContaining({ orderId: created.orderId })])
      );
    } finally {
      fetchMock.mockRestore();
      if (oldToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      else process.env.MERCADO_PAGO_ACCESS_TOKEN = oldToken;
      if (oldSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      else process.env.MERCADO_PAGO_WEBHOOK_SECRET = oldSecret;
      await database.$executeRawUnsafe(
        `UPDATE store_settings SET order_receipt_mode='MANUAL' WHERE tenant_id=$1`,
        tenantId
      );
    }
  });

  it('persists a rejected PIX result and prevents order creation', async () => {
    await setAvailability(true, true);
    const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'integration-access-token';
    const providerOrderId = `ORD${randomUUID().replaceAll('-', '')}`;
    const providerPaymentId = `PAY${randomUUID().replaceAll('-', '')}`;
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        external_reference: string;
        total_amount: string;
      };
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: providerOrderId,
            total_amount: body.total_amount,
            external_reference: body.external_reference,
            transactions: {
              payments: [
                {
                  id: providerPaymentId,
                  status: 'failed',
                  status_detail: 'rejected_by_bank',
                  amount: body.total_amount,
                  payment_method: { id: 'pix', type: 'bank_transfer' }
                }
              ]
            }
          })
      } as Response);
    });
    const idempotencyKey = randomUUID();
    const draft = {
      menuSlug,
      customer: {
        name: 'Cliente PIX Rejeitado',
        phone: '67992220003',
        email: 'pix.rejeitado@example.com'
      },
      fulfillment: 'PICKUP' as const,
      address: null,
      items: [{ menuItemId, quantity: 1 }]
    };

    try {
      const payment = await payments.create({
        checkoutId: idempotencyKey,
        method: 'PIX',
        ...draft
      });
      expect(payment).toMatchObject({ method: 'PIX', status: 'FAILED', amountCents: 4590 });
      await expect(
        nativeOrders.create({
          idempotencyKey,
          ...draft,
          payment: { method: 'PIX', paymentId: payment.paymentId }
        })
      ).rejects.toThrow('O pagamento não pertence a este checkout');
      const [attempt] = await database.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status FROM commerce_payment_attempts WHERE id=$1::uuid`,
        payment.paymentId
      );
      expect(attempt?.status).toBe('FAILED');
    } finally {
      fetchMock.mockRestore();
      if (oldToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      else process.env.MERCADO_PAGO_ACCESS_TOKEN = oldToken;
    }
  });

  it('applies a tenant coupon atomically and preserves its order snapshot', async () => {
    const couponId = randomUUID();
    const otherCouponId = randomUUID();
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_coupons (
         id,tenant_id,code,name,source,discount_type,discount_value,active,max_uses
       ) VALUES
         ($1::uuid,$2,'SANTO10','Santo 10','RC1','PERCENTAGE',10,true,1),
         ($3::uuid,$4,'SANTO10','Outro tenant','ISOLATION','PERCENTAGE',50,true,NULL)`,
      couponId,
      tenantId,
      otherCouponId,
      otherTenantId
    );

    const priced = await checkout.price({
      menuSlug,
      couponCode: 'santo10',
      items: [{ menuItemId, quantity: 1 }]
    });
    expect(priced).toMatchObject({
      itemsTotalCents: 4590,
      discountCents: 459,
      amountDueCents: 4131,
      coupon: { code: 'SANTO10', discountValue: 10 }
    });

    const idempotencyKey = randomUUID();
    const paymentDraft = {
      idempotencyKey,
      menuSlug,
      couponCode: 'SANTO10',
      customer: { name: 'Cliente Cupom', phone: '67999999994' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    };
    const payment = await createPayOnDeliveryPayment(paymentDraft);
    expect(payment.amountCents).toBe(4131);
    const request = {
      idempotencyKey,
      menuSlug,
      couponCode: 'SANTO10',
      customer: paymentDraft.customer,
      fulfillment: paymentDraft.fulfillment,
      items: paymentDraft.items,
      payment: {
        method: payment.method,
        paymentId: payment.paymentId
      }
    };
    const created = await nativeOrders.create(request);
    expect(created).toMatchObject({
      itemsTotalCents: 4590,
      discountCents: 459,
      totalCents: 4131,
      coupon: { code: 'SANTO10', name: 'Santo 10', source: 'RC1' }
    });
    await expect(nativeOrders.create(request)).resolves.toMatchObject({
      orderId: created.orderId,
      discountCents: 459,
      totalCents: 4131,
      coupon: { code: 'SANTO10' }
    });
    await expect(tracking.status(created.orderId, idempotencyKey)).resolves.toMatchObject({
      orderNumber: created.orderNumber,
      itemsTotalCents: 4590,
      discountCents: 459,
      totalCents: 4131,
      couponCode: 'SANTO10'
    });
    await expect(kitchen.detail(authorization, tenantId, created.orderId)).resolves.toMatchObject({
      order: {
        orderNumber: created.orderNumber,
        itemsTotalCents: 4590,
        discountCents: 459,
        totalCents: 4131,
        couponCode: 'SANTO10'
      }
    });

    const snapshots = await database.$queryRawUnsafe<
      Array<{
        discountCents: number;
        code: string | null;
        source: string | null;
        usesCount: number;
      }>
    >(
      `SELECT o.discount_cents AS "discountCents",o.coupon_code AS code,
              o.coupon_source AS source,c.uses_count AS "usesCount"
         FROM commerce_native_orders o
         JOIN commerce_coupons c ON c.id=o.coupon_id
        WHERE o.id=$1::uuid`,
      created.orderId
    );
    expect(snapshots[0]).toEqual({
      discountCents: 459,
      code: 'SANTO10',
      source: 'RC1',
      usesCount: 1
    });
    const tenantUsage = await database.$queryRawUnsafe<
      Array<{ tenantId: string; usesCount: number }>
    >(
      `SELECT tenant_id AS "tenantId",uses_count AS "usesCount"
         FROM commerce_coupons WHERE code='SANTO10' ORDER BY tenant_id`
    );
    expect(tenantUsage).toEqual(
      expect.arrayContaining([
        { tenantId, usesCount: 1 },
        { tenantId: otherTenantId, usesCount: 0 }
      ])
    );

    await expect(
      nativeOrders.create({ ...request, idempotencyKey: randomUUID() })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { operationallyOpen: false, withinSchedule: true, label: 'fechamento manual' },
    { operationallyOpen: true, withinSchedule: false, label: 'fora do horário' }
  ])(
    'does not create an order or consume a valid coupon during $label',
    async ({ operationallyOpen, withinSchedule }) => {
      const couponId = randomUUID();
      const code = `FECHADO${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
      await database.$executeRawUnsafe(
        `INSERT INTO commerce_coupons
           (id,tenant_id,code,name,discount_type,discount_value,active,max_uses)
         VALUES ($1::uuid,$2,$3,'Cupom fechado','FIXED_AMOUNT',500,true,1)`,
        couponId,
        tenantId,
        code
      );
      await setAvailability(operationallyOpen, withinSchedule);
      const phone = `67${randomUUID().replaceAll('-', '').slice(0, 9)}`;
      const [before] = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) AS count FROM commerce_payment_attempts WHERE tenant_id=$1`,
        tenantId
      );
      const closedDraft = {
        checkoutId: randomUUID(),
        menuSlug,
        couponCode: code,
        method: 'PAY_ON_DELIVERY' as const,
        customer: { name: 'Cliente Loja Fechada Cupom', phone },
        fulfillment: 'PICKUP' as const,
        address: null,
        items: [{ menuItemId, quantity: 1 }]
      };

      await expect(payments.create(closedDraft)).rejects.toBeInstanceOf(ConflictException);

      const [coupon] = await database.$queryRawUnsafe<Array<{ usesCount: number }>>(
        `SELECT uses_count AS "usesCount" FROM commerce_coupons WHERE id=$1::uuid`,
        couponId
      );
      const [orders] = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) AS count FROM commerce_native_orders
         WHERE tenant_id=$1 AND customer_phone=$2`,
        tenantId,
        phone
      );
      expect(coupon?.usesCount).toBe(0);
      expect(orders?.count).toBe(0n);
      const [after] = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) AS count FROM commerce_payment_attempts WHERE tenant_id=$1`,
        tenantId
      );
      expect(after?.count).toBe(before?.count);
      await setAvailability(true, true);
    }
  );

  it('consumes a limited coupon exactly once for concurrent idempotent retries', async () => {
    await setAvailability(true, true);
    const couponId = randomUUID();
    const code = `RETRY${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_coupons
         (id,tenant_id,code,name,discount_type,discount_value,active,max_uses)
       VALUES ($1::uuid,$2,$3,'Retry','PERCENTAGE',10,true,1)`,
      couponId,
      tenantId,
      code
    );
    const draft = {
      idempotencyKey: randomUUID(),
      menuSlug,
      couponCode: code,
      customer: { name: 'Cliente Retry Concorrente', phone: '67995550001' },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    };
    const payment = await createPayOnDeliveryPayment(draft);
    const request = {
      ...draft,
      payment: { method: payment.method, paymentId: payment.paymentId }
    };

    const retries = await Promise.all(
      Array.from({ length: 6 }, () => nativeOrders.create(request))
    );
    expect(new Set(retries.map((order) => order.orderId))).toEqual(new Set([retries[0]!.orderId]));
    const [coupon] = await database.$queryRawUnsafe<Array<{ usesCount: number }>>(
      `SELECT uses_count AS "usesCount" FROM commerce_coupons WHERE id=$1::uuid`,
      couponId
    );
    const [orders] = await database.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM commerce_native_orders
       WHERE tenant_id=$1 AND customer_phone=$2`,
      tenantId,
      request.customer.phone
    );
    expect(coupon?.usesCount).toBe(1);
    expect(orders?.count).toBe(1n);
  });

  it('enforces a coupon usage limit under concurrent PostgreSQL transactions', async () => {
    await setAvailability(true, true);
    const couponId = randomUUID();
    const code = `RACE${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_coupons
         (id,tenant_id,code,name,discount_type,discount_value,active,max_uses)
       VALUES ($1::uuid,$2,$3,'Concorrência','FIXED_AMOUNT',500,true,3)`,
      couponId,
      tenantId,
      code
    );

    const drafts = Array.from({ length: 8 }, (_, index) => ({
      idempotencyKey: randomUUID(),
      menuSlug,
      couponCode: code,
      customer: { name: `Cliente Limite ${index}`, phone: `6799444000${index}` },
      fulfillment: 'PICKUP' as const,
      items: [{ menuItemId, quantity: 1 }]
    }));
    const attempts = await Promise.all(drafts.map(createPayOnDeliveryPayment));
    const results = await Promise.allSettled(
      drafts.map((draft, index) =>
        nativeOrders.create({
          ...draft,
          payment: { method: attempts[index]!.method, paymentId: attempts[index]!.paymentId }
        })
      )
    );
    const created = results
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<Awaited<ReturnType<typeof nativeOrders.create>>> =>
          result.status === 'fulfilled'
      )
      .map((result) => result.value);
    expect(created).toHaveLength(3);
    expect(new Set(created.map((order) => order.orderNumber)).size).toBe(3);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(5);
    const [coupon] = await database.$queryRawUnsafe<Array<{ usesCount: number }>>(
      `SELECT uses_count AS "usesCount" FROM commerce_coupons WHERE id=$1::uuid`,
      couponId
    );
    expect(coupon?.usesCount).toBe(3);
  });

  it('preserves delivery, structured notes and server totals with a fixed coupon', async () => {
    await setAvailability(true, true);
    const couponId = randomUUID();
    const code = `ENTREGA${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    await database.$executeRawUnsafe(
      `INSERT INTO commerce_coupons
         (id,tenant_id,code,name,discount_type,discount_value,active)
       VALUES ($1::uuid,$2,$3,'Entrega 500','FIXED_AMOUNT',500,true)`,
      couponId,
      tenantId,
      code
    );
    const address = {
      street: 'Rua do Cupom',
      number: '59',
      district: 'Centro',
      complement: 'Fundos',
      reference: 'Portão vermelho'
    };
    const draft = {
      menuSlug,
      couponCode: code,
      fulfillment: 'DELIVERY' as const,
      customer: { name: 'Cliente Entrega Cupom', phone: '67993330001' },
      address,
      orderNote: 'Não tocar a campainha',
      items: [{ menuItemId, quantity: 1, note: 'Sem cebola' }]
    };
    await expect(checkout.validate(draft)).resolves.toMatchObject({
      itemsTotalCents: 4590,
      discountCents: 500,
      deliveryFeeCents: 0,
      amountDueCents: 4090,
      address,
      orderNote: 'Não tocar a campainha'
    });
    const idempotencyKey = randomUUID();
    const payment = await createPayOnDeliveryPayment({ idempotencyKey, ...draft });
    expect(payment.amountCents).toBe(4090);
    const created = await nativeOrders.create({
      idempotencyKey,
      ...draft,
      payment: { method: payment.method, paymentId: payment.paymentId }
    });
    expect(created).toMatchObject({
      fulfillment: 'DELIVERY',
      itemsTotalCents: 4590,
      discountCents: 500,
      deliveryFeeCents: 0,
      totalCents: 4090,
      orderNumber: expect.stringMatching(/^\d{5}$/)
    });
    await expect(kitchen.detail(authorization, tenantId, created.orderId)).resolves.toMatchObject({
      order: {
        deliveryAddress: address,
        orderNote: 'Não tocar a campainha',
        discountCents: 500,
        couponCode: code
      },
      items: [expect.objectContaining({ note: 'Sem cebola' })]
    });
    await expect(tracking.status(created.orderId, idempotencyKey)).resolves.toMatchObject({
      fulfillment: 'DELIVERY',
      orderNote: 'Não tocar a campainha',
      discountCents: 500,
      totalCents: 4090,
      couponCode: code,
      items: [expect.objectContaining({ note: 'Sem cebola' })]
    });
  });
});

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for integration tests.`);
  return value;
}
