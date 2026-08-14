import { createHash } from 'node:crypto';
import { Client } from 'pg';

const databaseUrl = process.env.VERO_DATABASE_URL;

describe('VERO Commerce native order persistence', () => {
  let db: Client;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('VERO_DATABASE_URL is required for integration tests');
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
  });

  afterAll(async () => {
    await db?.end();
  });

  it('persists an order, its lines and status history and can safely track it', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantId = `commerce-e2e-${suffix}`;
    const productId = crypto.randomUUID();
    const menuId = crypto.randomUUID();
    const categoryId = crypto.randomUUID();
    const menuItemId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const orderItemId = crypto.randomUUID();
    const historyId = crypto.randomUUID();
    const trackingToken = `tracking-${suffix}`;
    const trackingTokenHash = createHash('sha256').update(trackingToken).digest('hex');
    const now = new Date();

    try {
      await db.query(
        'INSERT INTO catalog_products (id, "tenantId", name, "salePriceCents", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$5)',
        [productId, tenantId, 'Parmegiana E2E', 4290, now]
      );
      await db.query(
        'INSERT INTO commerce_menus (id, tenant_id, name, slug, published, created_at, updated_at) VALUES ($1,$2,$3,$4,true,$5,$5)',
        [menuId, tenantId, 'Menu E2E', `menu-${suffix}`, now]
      );
      await db.query(
        'INSERT INTO commerce_menu_categories (id, tenant_id, menu_id, name, sort_order, active, created_at, updated_at) VALUES ($1,$2,$3,$4,0,true,$5,$5)',
        [categoryId, tenantId, menuId, 'Principais', now]
      );
      await db.query(
        'INSERT INTO commerce_menu_items (id, tenant_id, menu_id, category_id, catalog_product_id, sale_price_cents, active, available, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,true,true,$7,$7)',
        [menuItemId, tenantId, menuId, categoryId, productId, 4290, now]
      );
      await db.query(
        `INSERT INTO commerce_native_orders
         (id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,items_total_cents,delivery_fee_cents,total_cents,payment_method,payment_status,status,tracking_token_hash,created_at,updated_at)
         VALUES ($1,$2,$3,'VERO_NATIVE','Cliente E2E','67999999999','PICKUP',4290,0,4290,'PAY_ON_DELIVERY','PENDING','RECEIVED',$4,$5,$5)`,
        [orderId, tenantId, `menu-${suffix}`, trackingTokenHash, now]
      );
      await db.query(
        'INSERT INTO commerce_native_order_items (id,order_id,menu_item_id,name,quantity,unit_price_cents,total_cents) VALUES ($1,$2,$3,$4,1,4290,4290)',
        [orderItemId, orderId, menuItemId, 'Parmegiana E2E']
      );
      await db.query(
        `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at)
         VALUES ($1,$2,NULL,'RECEIVED',$3)`,
        [historyId, orderId, now]
      );

      const order = await db.query(
        `SELECT o.provider,o.payment_status,o.status,o.tracking_token_hash,
                COUNT(DISTINCT i.id)::int AS item_count,
                COUNT(DISTINCT h.id)::int AS history_count
           FROM commerce_native_orders o
           LEFT JOIN commerce_native_order_items i ON i.order_id=o.id
           LEFT JOIN commerce_native_order_status_history h ON h.order_id=o.id
          WHERE o.id=$1
          GROUP BY o.id`,
        [orderId]
      );
      expect(order.rows[0]).toMatchObject({
        provider: 'VERO_NATIVE',
        payment_status: 'PENDING',
        status: 'RECEIVED',
        tracking_token_hash: trackingTokenHash,
        item_count: 1,
        history_count: 1
      });
      expect(order.rows[0].tracking_token_hash).not.toBe(trackingToken);

      await db.query(
        `UPDATE commerce_native_orders SET status='CONFIRMED',updated_at=NOW()
          WHERE id=$1 AND tenant_id=$2 AND status='RECEIVED'`,
        [orderId, tenantId]
      );
      await db.query(
        `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at)
         VALUES ($1,$2,'RECEIVED','CONFIRMED',NOW())`,
        [crypto.randomUUID(), orderId]
      );
      const transitioned = await db.query('SELECT status FROM commerce_native_orders WHERE id=$1', [orderId]);
      expect(transitioned.rows[0]?.status).toBe('CONFIRMED');
    } finally {
      await db.query('DELETE FROM commerce_native_orders WHERE id=$1', [orderId]);
      await db.query('DELETE FROM commerce_menu_items WHERE tenant_id=$1', [tenantId]);
      await db.query('DELETE FROM commerce_menu_categories WHERE tenant_id=$1', [tenantId]);
      await db.query('DELETE FROM commerce_menus WHERE tenant_id=$1', [tenantId]);
      await db.query('DELETE FROM catalog_products WHERE "tenantId"=$1', [tenantId]);
    }
  });
});
