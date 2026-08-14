import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '@vero/infrastructure-database';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';
import { PublicOrderStatusController } from '../../apps/api/src/menu/public-order-status.controller';
import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';

describe('VERO Commerce native order homologation flow', () => {
  const databaseUrl = process.env.VERO_DATABASE_URL;
  if (!databaseUrl) throw new Error('VERO_DATABASE_URL is required for integration tests.');

  const db = createDatabaseClient(databaseUrl);
  const tenantId = `homolog-${randomUUID()}`;
  const menuId = randomUUID();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const menuItemId = randomUUID();
  const menuSlug = `homolog-${randomUUID()}`;
  const apiKey = 'vero-homologation-api-key-1234567890';

  beforeAll(async () => {
    const now = new Date();
    await db.$executeRawUnsafe(
      `INSERT INTO catalog_products (id,"tenantId",name,"salePriceCents","createdAt","updatedAt") VALUES ($1::uuid,$2,$3,$4,$5,$5)`,
      productId,
      tenantId,
      'Parmegiana Homologacao',
      4590,
      now
    );
    await db.$executeRawUnsafe(
      `INSERT INTO commerce_menus (id,tenant_id,name,slug,published,created_at,updated_at) VALUES ($1::uuid,$2,$3,$4,true,$5,$5)`,
      menuId,
      tenantId,
      'Cardapio Homologacao',
      menuSlug,
      now
    );
    await db.$executeRawUnsafe(
      `INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,sort_order,active,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4,0,true,$5,$5)`,
      categoryId,
      tenantId,
      menuId,
      'Principais',
      now
    );
    await db.$executeRawUnsafe(
      `INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,display_name,sale_price_cents,sort_order,active,available,featured,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,0,true,true,true,$8,$8)`,
      menuItemId,
      tenantId,
      menuId,
      categoryId,
      productId,
      'Parmegiana Homologacao',
      4590,
      now
    );
  });

  afterAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM commerce_native_orders WHERE tenant_id=$1`, tenantId);
    await db.$executeRawUnsafe(`DELETE FROM commerce_menus WHERE tenant_id=$1`, tenantId);
    await db.$executeRawUnsafe(`DELETE FROM catalog_products WHERE "tenantId"=$1`, tenantId);
    await db.$disconnect();
  });

  it('creates, tracks, queues and advances a native pay-on-delivery order', async () => {
    const native = new NativeOrderController(db);
    const tracking = new PublicOrderStatusController(db);
    const security = {
      authorize: jest.fn().mockResolvedValue({})
    };
    const kitchen = new KitchenOrderController(security as never, db);

    const created = await native.create({
      menuSlug,
      customer: { name: 'Cliente Homologacao', phone: '67999999999' },
      fulfillment: 'PICKUP',
      items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }],
      payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' }
    });

    expect(created.totalCents).toBe(9180);
    expect(created.status).toBe('RECEIVED');
    expect(created.trackingToken).toBeTruthy();

    const publicStatus = await tracking.status(created.orderId, created.trackingToken);
    expect(publicStatus).toMatchObject({
      orderId: created.orderId,
      status: 'RECEIVED',
      paymentStatus: 'PENDING',
      fulfillment: 'PICKUP'
    });

    const queue = (await kitchen.list(`Bearer ${apiKey}`, tenantId)) as {
      orders: Array<{ orderId: string; status: string }>;
    };
    expect(security.authorize).toHaveBeenCalledWith(
      `Bearer ${apiKey}`,
      tenantId,
      'orders.kitchen.list'
    );
    expect(queue.orders).toEqual(
      expect.arrayContaining([expect.objectContaining({ orderId: created.orderId, status: 'RECEIVED' })])
    );

    await kitchen.transition(`Bearer ${apiKey}`, tenantId, created.orderId, { status: 'CONFIRMED' });
    await kitchen.transition(`Bearer ${apiKey}`, tenantId, created.orderId, { status: 'PREPARING' });
    await kitchen.transition(`Bearer ${apiKey}`, tenantId, created.orderId, { status: 'READY' });

    const ready = await tracking.status(created.orderId, created.trackingToken);
    expect(ready.status).toBe('READY');

    const history = await db.$queryRawUnsafe<Array<{ toStatus: string }>>(
      `SELECT to_status AS "toStatus" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at,id`,
      created.orderId
    );
    expect(history.map((entry) => entry.toStatus)).toEqual([
      'RECEIVED',
      'CONFIRMED',
      'PREPARING',
      'READY'
    ]);
  });
});
