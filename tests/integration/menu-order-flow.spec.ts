import { createHash, randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { KitchenOrderController } from '../../apps/api/src/menu/kitchen-order.controller';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';
import { PublicCheckoutController } from '../../apps/api/src/menu/public-checkout.controller';
import { PublicOrderStatusController } from '../../apps/api/src/menu/public-order-status.controller';

const databaseUrl = process.env.VERO_DATABASE_URL;
if (!databaseUrl) throw new Error('VERO_DATABASE_URL is required for integration tests.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const db = prisma as unknown as {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};
const tenantId = `tenant-menu-flow-${randomUUID()}`;
const menuId = randomUUID();
const categoryId = randomUUID();
const productId = randomUUID();
const menuItemId = randomUUID();
const menuSlug = `menu-flow-${randomUUID()}`;

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`INSERT INTO catalog_products (id,"tenantId",name,"salePriceCents","createdAt","updatedAt") VALUES ($1::uuid,$2,$3,$4,NOW(),NOW())`, productId, tenantId, 'Parmegiana Teste', 4290);
  await prisma.$executeRawUnsafe(`INSERT INTO commerce_menus (id,tenant_id,name,slug,published,created_at,updated_at) VALUES ($1::uuid,$2,$3,$4,true,NOW(),NOW())`, menuId, tenantId, 'Menu Homologacao', menuSlug);
  await prisma.$executeRawUnsafe(`INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,sort_order,active,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4,0,true,NOW(),NOW())`, categoryId, tenantId, menuId, 'Principais');
  await prisma.$executeRawUnsafe(`INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,display_name,sale_price_cents,available,active,featured,sort_order,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,true,true,false,0,NOW(),NOW())`, menuItemId, tenantId, menuId, categoryId, productId, 'Parmegiana Homologacao', 4290);
});

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_native_order_status_history WHERE order_id IN (SELECT id FROM commerce_native_orders WHERE tenant_id=$1)`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_native_order_items WHERE order_id IN (SELECT id FROM commerce_native_orders WHERE tenant_id=$1)`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_native_orders WHERE tenant_id=$1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_menu_items WHERE tenant_id=$1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_menu_categories WHERE tenant_id=$1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM commerce_menus WHERE tenant_id=$1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM catalog_products WHERE "tenantId"=$1`, tenantId);
  await prisma.$disconnect();
});

test('validates, persists, tracks and advances a native order', async () => {
  const checkout = new PublicCheckoutController(db);
  const validated = await checkout.validate({ menuSlug, fulfillment: 'PICKUP', customer: { name: 'Cliente Teste', phone: '67999999999' }, items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }] });
  expect(validated.amountDueCents).toBe(8580);
  expect(validated.items[0]?.unitPriceCents).toBe(4290);

  const orders = new NativeOrderController(db);
  const created = await orders.create({ menuSlug, customer: { name: 'Cliente Teste', phone: '67999999999' }, fulfillment: 'PICKUP', items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }], payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' } });
  expect(created.totalCents).toBe(8580);
  expect(created.status).toBe('RECEIVED');

  const persisted = await prisma.$queryRawUnsafe<Array<{ totalCents: number; trackingTokenHash: string }>>(`SELECT total_cents AS "totalCents",tracking_token_hash AS "trackingTokenHash" FROM commerce_native_orders WHERE id=$1::uuid`, created.orderId);
  expect(persisted[0]?.totalCents).toBe(8580);
  expect(persisted[0]?.trackingTokenHash).toBe(createHash('sha256').update(created.trackingToken).digest('hex'));

  const publicStatus = new PublicOrderStatusController(db);
  expect(await publicStatus.status(created.orderId, created.trackingToken)).toMatchObject({ orderId: created.orderId, status: 'RECEIVED', fulfillment: 'PICKUP' });
  await expect(publicStatus.status(created.orderId, 'invalid-token')).rejects.toBeDefined();

  const security = { authorize: jest.fn().mockResolvedValue(undefined) };
  const kitchen = new KitchenOrderController(security as never, db);
  const queue = await kitchen.list('Bearer test', tenantId);
  expect(queue.orders).toEqual(expect.arrayContaining([expect.objectContaining({ orderId: created.orderId, status: 'RECEIVED' })]));
  await kitchen.transition('Bearer test', tenantId, created.orderId, { status: 'ACCEPTED' });
  await kitchen.transition('Bearer test', tenantId, created.orderId, { status: 'PREPARING' });
  expect((await publicStatus.status(created.orderId, created.trackingToken)).status).toBe('PREPARING');

  const history = await prisma.$queryRawUnsafe<Array<{ toStatus: string }>>(`SELECT to_status AS "toStatus" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at`, created.orderId);
  expect(history.map((entry) => entry.toStatus)).toEqual(['RECEIVED', 'ACCEPTED', 'PREPARING']);
});
