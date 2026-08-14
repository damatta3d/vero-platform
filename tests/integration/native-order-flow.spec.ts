import { createHash } from 'node:crypto';
import { createDatabaseClient } from '@vero/infrastructure-database';
import { PublicCheckoutController } from '../../apps/api/src/menu/public-checkout.controller';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';
import { PublicOrderStatusController } from '../../apps/api/src/menu/public-order-status.controller';
import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';

describe('VERO native order flow', () => {
  const db = createDatabaseClient(required('VERO_DATABASE_URL')) as any;
  const tenantId = 'santo-parma-item13';
  const productId = '81000000-0000-4000-8000-000000000001';
  const menuId = '82000000-0000-4000-8000-000000000001';
  const categoryId = '83000000-0000-4000-8000-000000000001';
  const menuItemId = '84000000-0000-4000-8000-000000000001';
  const menuSlug = 'santo-parma-item13';

  beforeAll(async () => {
    await db.$executeRawUnsafe('DELETE FROM commerce_native_order_status_history WHERE order_id IN (SELECT id FROM commerce_native_orders WHERE tenant_id=$1)', tenantId);
    await db.$executeRawUnsafe('DELETE FROM commerce_native_order_items WHERE order_id IN (SELECT id FROM commerce_native_orders WHERE tenant_id=$1)', tenantId);
    await db.$executeRawUnsafe('DELETE FROM commerce_native_orders WHERE tenant_id=$1', tenantId);
    await db.$executeRawUnsafe('DELETE FROM commerce_menu_items WHERE tenant_id=$1', tenantId);
    await db.$executeRawUnsafe('DELETE FROM commerce_menu_categories WHERE tenant_id=$1', tenantId);
    await db.$executeRawUnsafe('DELETE FROM commerce_menus WHERE tenant_id=$1', tenantId);
    await db.$executeRawUnsafe('DELETE FROM catalog_products WHERE "tenantId"=$1', tenantId);
    const now = new Date();
    await db.$executeRawUnsafe('INSERT INTO catalog_products (id,"tenantId",name,"salePriceCents","createdAt","updatedAt") VALUES ($1::uuid,$2,$3,$4,$5,$5)', productId, tenantId, 'Parmegiana Item 13', 4490, now);
    await db.$executeRawUnsafe('INSERT INTO commerce_menus (id,tenant_id,name,slug,published,created_at,updated_at) VALUES ($1::uuid,$2,$3,$4,true,$5,$5)', menuId, tenantId, 'Santo Parma', menuSlug, now);
    await db.$executeRawUnsafe('INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,sort_order,active,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4,0,true,$5,$5)', categoryId, tenantId, menuId, 'Parmegianas', now);
    await db.$executeRawUnsafe('INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,sort_order,active,available,featured,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,0,true,true,true,$6,$6)', menuItemId, tenantId, menuId, categoryId, productId, now);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('validates server price, persists order, tracks securely and advances kitchen workflow', async () => {
    const checkout = new PublicCheckoutController(db);
    const validated = await checkout.validate({
      menuSlug,
      customer: { name: 'Cliente Item 13', phone: '67999999999' },
      fulfillment: 'PICKUP',
      items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }]
    });
    expect(validated.amountDueCents).toBe(8980);
    expect(validated.items[0]?.unitPriceCents).toBe(4490);

    const nativeOrders = new NativeOrderController(db);
    const created = await nativeOrders.create({
      menuSlug,
      customer: { name: 'Cliente Item 13', phone: '67999999999' },
      fulfillment: 'PICKUP',
      items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }],
      payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' }
    });
    expect(created.totalCents).toBe(8980);
    expect(created.status).toBe('RECEIVED');
    expect(created.trackingToken).toBeTruthy();

    const stored = await db.$queryRawUnsafe<Array<{ totalCents: number; tokenHash: string }>>('SELECT total_cents AS "totalCents", tracking_token_hash AS "tokenHash" FROM commerce_native_orders WHERE id=$1::uuid', created.orderId);
    expect(stored[0]?.totalCents).toBe(8980);
    expect(stored[0]?.tokenHash).toBe(createHash('sha256').update(created.trackingToken).digest('hex'));
    expect(stored[0]?.tokenHash).not.toBe(created.trackingToken);

    const status = new PublicOrderStatusController(db);
    await expect(status.status(created.orderId, 'wrong-token')).rejects.toBeDefined();
    await expect(status.status(created.orderId, created.trackingToken)).resolves.toMatchObject({ orderId: created.orderId, status: 'RECEIVED', paymentStatus: 'PENDING' });

    const security = { authorize: jest.fn().mockResolvedValue(undefined) } as any;
    const kitchen = new KitchenOrderController(security, db);
    const queue = await kitchen.list('Bearer test', tenantId);
    expect(queue.orders).toEqual(expect.arrayContaining([expect.objectContaining({ orderId: created.orderId, status: 'RECEIVED' })]));

    await expect(kitchen.transition('Bearer test', tenantId, created.orderId, { status: 'CONFIRMED' })).resolves.toEqual({ orderId: created.orderId, status: 'CONFIRMED' });
    await expect(kitchen.transition('Bearer test', tenantId, created.orderId, { status: 'PREPARING' })).resolves.toEqual({ orderId: created.orderId, status: 'PREPARING' });
    await expect(status.status(created.orderId, created.trackingToken)).resolves.toMatchObject({ status: 'PREPARING' });

    const history = await db.$queryRawUnsafe<Array<{ toStatus: string }>>('SELECT to_status AS "toStatus" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at', created.orderId);
    expect(history.map((entry) => entry.toStatus)).toEqual(['RECEIVED', 'CONFIRMED', 'PREPARING']);
  });
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
