import { createHash } from 'node:crypto';
import { createDatabaseClient } from '@vero/infrastructure-database';
import { NativeOrderController } from '../../apps/api/src/menu/native-order.controller';

describe('commerce native order persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL')) as unknown as {
    $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
    $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
    $disconnect(): Promise<void>;
  };
  const controller = new NativeOrderController(client);
  const tenantId = 'santo-parma-commerce-e2e';
  const productId = '81000000-0000-4000-8000-000000000001';
  const menuId = '82000000-0000-4000-8000-000000000001';
  const categoryId = '83000000-0000-4000-8000-000000000001';
  const menuItemId = '84000000-0000-4000-8000-000000000001';
  const menuSlug = 'santo-parma-commerce-e2e';

  beforeAll(async () => {
    await client.$executeRawUnsafe(
      `INSERT INTO catalog_products (id,"tenantId",name,"salePriceCents","createdAt","updatedAt") VALUES ($1::uuid,$2,$3,$4,now(),now()) ON CONFLICT ("tenantId",id) DO UPDATE SET "salePriceCents"=EXCLUDED."salePriceCents","updatedAt"=now()`,
      productId,
      tenantId,
      'Parmegiana E2E',
      3390
    );
    await client.$executeRawUnsafe(
      `INSERT INTO commerce_menus (id,tenant_id,name,slug,published,created_at,updated_at) VALUES ($1::uuid,$2,$3,$4,true,now(),now()) ON CONFLICT (slug) DO UPDATE SET published=true,updated_at=now()`,
      menuId,
      tenantId,
      'Santo Parma E2E',
      menuSlug
    );
    await client.$executeRawUnsafe(
      `INSERT INTO commerce_menu_categories (id,tenant_id,menu_id,name,sort_order,active,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4,0,true,now(),now()) ON CONFLICT (tenant_id,id) DO UPDATE SET active=true,updated_at=now()`,
      categoryId,
      tenantId,
      menuId,
      'Parmegianas'
    );
    await client.$executeRawUnsafe(
      `INSERT INTO commerce_menu_items (id,tenant_id,menu_id,category_id,catalog_product_id,display_name,sale_price_cents,active,available,created_at,updated_at) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,true,true,now(),now()) ON CONFLICT (tenant_id,id) DO UPDATE SET sale_price_cents=EXCLUDED.sale_price_cents,active=true,available=true,updated_at=now()`,
      menuItemId,
      tenantId,
      menuId,
      categoryId,
      productId,
      'Parmegiana E2E',
      3390
    );
  });

  afterAll(async () => {
    await client.$executeRawUnsafe(`DELETE FROM commerce_native_orders WHERE tenant_id=$1`, tenantId);
    await client.$executeRawUnsafe(`DELETE FROM commerce_menu_items WHERE tenant_id=$1`, tenantId);
    await client.$executeRawUnsafe(`DELETE FROM commerce_menu_categories WHERE tenant_id=$1`, tenantId);
    await client.$executeRawUnsafe(`DELETE FROM commerce_menus WHERE tenant_id=$1`, tenantId);
    await client.$executeRawUnsafe(`DELETE FROM catalog_products WHERE "tenantId"=$1`, tenantId);
    await client.$disconnect();
  });

  it('creates a VERO_NATIVE order from server-side catalog prices and persists tracking safely', async () => {
    const created = await controller.create({
      menuSlug,
      customer: { name: 'Cliente E2E', phone: '67999999999' },
      fulfillment: 'PICKUP',
      items: [{ menuItemId, quantity: 2, note: 'Sem cebola' }],
      payment: { method: 'PAY_ON_DELIVERY', status: 'PENDING' }
    });

    expect(created.provider).toBe('VERO_NATIVE');
    expect(created.itemsTotalCents).toBe(6780);
    expect(created.totalCents).toBe(6780);
    expect(created.status).toBe('RECEIVED');
    expect(created.trackingToken).toHaveLength(43);

    const orders = await client.$queryRawUnsafe<
      Array<{ totalCents: number; status: string; trackingTokenHash: string; customerPhone: string }>
    >(
      `SELECT total_cents AS "totalCents",status,tracking_token_hash AS "trackingTokenHash",customer_phone AS "customerPhone" FROM commerce_native_orders WHERE id=$1::uuid`,
      created.orderId
    );
    expect(orders).toEqual([
      expect.objectContaining({
        totalCents: 6780,
        status: 'RECEIVED',
        customerPhone: '67999999999',
        trackingTokenHash: createHash('sha256').update(created.trackingToken).digest('hex')
      })
    ]);

    const items = await client.$queryRawUnsafe<Array<{ quantity: number; unitPriceCents: number; totalCents: number }>>(
      `SELECT quantity,unit_price_cents AS "unitPriceCents",total_cents AS "totalCents" FROM commerce_native_order_items WHERE order_id=$1::uuid`,
      created.orderId
    );
    expect(items).toEqual([{ quantity: 2, unitPriceCents: 3390, totalCents: 6780 }]);

    const history = await client.$queryRawUnsafe<Array<{ toStatus: string }>>(
      `SELECT to_status AS "toStatus" FROM commerce_native_order_status_history WHERE order_id=$1::uuid ORDER BY occurred_at`,
      created.orderId
    );
    expect(history).toEqual([{ toStatus: 'RECEIVED' }]);
  });
});

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for integration tests.`);
  return value;
}
