import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('VERO Commerce native order persistence', () => {
  const prisma = new PrismaClient();
  const tenantId = `item13-${randomUUID()}`;
  const productId = randomUUID();
  const menuId = randomUUID();
  const categoryId = randomUUID();
  const menuItemId = randomUUID();
  const orderId = randomUUID();
  const slug = `item13-${randomUUID()}`;

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM commerce_native_order_status_history WHERE order_id = $1::uuid', orderId);
    await prisma.$executeRawUnsafe('DELETE FROM commerce_native_order_items WHERE order_id = $1::uuid', orderId);
    await prisma.$executeRawUnsafe('DELETE FROM commerce_native_orders WHERE id = $1::uuid', orderId);
    await prisma.$executeRawUnsafe('DELETE FROM commerce_menu_items WHERE tenant_id = $1', tenantId);
    await prisma.$executeRawUnsafe('DELETE FROM commerce_menu_categories WHERE tenant_id = $1', tenantId);
    await prisma.$executeRawUnsafe('DELETE FROM commerce_menus WHERE tenant_id = $1', tenantId);
    await prisma.$executeRawUnsafe('DELETE FROM catalog_products WHERE "tenantId" = $1', tenantId);
    await prisma.$disconnect();
  });

  it('persists a published menu, native order, items, tracking token and status history', async () => {
    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      'INSERT INTO catalog_products (id,"tenantId",name,"salePriceCents","createdAt","updatedAt") VALUES ($1::uuid,$2,$3,$4,$5::timestamptz,$5::timestamptz)',
      productId,
      tenantId,
      'Parmegiana Item 13',
      4290,
      now
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO commerce_menus (id,tenant_id,name,slug,published,created_at,updated_at) VALUES ($1::uuid,$2,$3,$4,true,$5::timestamptz,$5::timestamptz)',
      menuId,
      tenantId,
      'Santo Parma Item 13',
      slug,
      now
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,sort_order,active,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4,0,true,$5::timestamptz,$5::timestamptz)',
      categoryId,
      tenantId,
      menuId,
      'Parmegianas',
      now
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,sort_order,active,available,featured,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,0,true,true,true,$6::timestamptz,$6::timestamptz)',
      menuItemId,
      tenantId,
      menuId,
      categoryId,
      productId,
      now
    );

    const trackingHash = 'a'.repeat(64);
    await prisma.$executeRawUnsafe(
      `INSERT INTO commerce_native_orders (id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,items_total_cents,delivery_fee_cents,total_cents,payment_method,payment_status,status,tracking_token_hash,created_at,updated_at)
       VALUES ($1::uuid,$2,$3,'VERO_NATIVE','Cliente Item 13','67999999999','PICKUP',4290,0,4290,'PAY_ON_DELIVERY','PENDING','RECEIVED',$4,$5::timestamptz,$5::timestamptz)`,
      orderId,
      tenantId,
      slug,
      trackingHash,
      now
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO commerce_native_order_items (id,order_id,menu_item_id,name,quantity,unit_price_cents,total_cents) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,1,4290,4290)',
      randomUUID(),
      orderId,
      menuItemId,
      'Parmegiana Item 13'
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at) VALUES ($1::uuid,$2::uuid,NULL,'RECEIVED',$3::timestamptz)`,
      randomUUID(),
      orderId,
      now
    );

    const orders = await prisma.$queryRawUnsafe<Array<{ status: string; trackingTokenHash: string }>>(
      'SELECT status,tracking_token_hash AS "trackingTokenHash" FROM commerce_native_orders WHERE id=$1::uuid',
      orderId
    );
    const items = await prisma.$queryRawUnsafe<Array<{ totalCents: number }>>(
      'SELECT total_cents AS "totalCents" FROM commerce_native_order_items WHERE order_id=$1::uuid',
      orderId
    );
    const history = await prisma.$queryRawUnsafe<Array<{ toStatus: string }>>(
      'SELECT to_status AS "toStatus" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at',
      orderId
    );

    expect(orders).toEqual([{ status: 'RECEIVED', trackingTokenHash: trackingHash }]);
    expect(items).toEqual([{ totalCents: 4290 }]);
    expect(history).toEqual([{ toStatus: 'RECEIVED' }]);
  });
});
