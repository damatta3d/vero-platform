import { createProduct } from '@vero/business-catalog';
import { ExternalCatalogLinkError } from '@vero/business-sales';
import {
  createDatabaseClient,
  PrismaCatalogRepository,
  PrismaExternalCatalogLinkRepository
} from '@vero/infrastructure-database';

describe('external catalog link persistence', () => {
  const client = createDatabaseClient(required('VERO_DATABASE_URL'));
  const catalog = new PrismaCatalogRepository(client);
  const links = new PrismaExternalCatalogLinkRepository(client);
  const tenantId = 'santo-parma-anota-ai-links';
  const otherTenant = 'other-restaurant-anota-ai-links';
  const firstProductId = '81000000-0000-4000-8000-000000000001';
  const secondProductId = '81000000-0000-4000-8000-000000000002';
  const at = new Date('2026-07-29T16:30:00.000Z');
  const link = {
    tenantId,
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-1',
    kind: 'ITEM' as const,
    providerItemId: 'item-1',
    catalogProductId: firstProductId
  };

  beforeAll(async () => {
    for (const [id, name] of [
      [firstProductId, 'Parmegiana individual'],
      [secondProductId, 'Parmegiana generosa']
    ] as const) {
      await catalog.saveProduct(
        createProduct({
          id,
          tenantId,
          name,
          salePriceCents: 4490,
          createdAt: at,
          updatedAt: at
        })
      );
    }
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('persists and deliberately replaces one tenant-scoped homologation', async () => {
    const first = await links.upsert(link, { authoredBy: 'christian', at });
    const updatedAt = new Date('2026-07-29T16:31:00.000Z');
    const replaced = await links.upsert(
      { ...link, catalogProductId: secondProductId },
      { authoredBy: 'christian-review', at: updatedAt }
    );

    expect(first).toMatchObject({
      catalogProductId: firstProductId,
      authoredBy: 'christian'
    });
    expect(replaced).toMatchObject({
      catalogProductId: secondProductId,
      authoredBy: 'christian-review',
      createdAt: at,
      updatedAt
    });
    await expect(links.list(tenantId, 'ANOTA_AI', 'page-1')).resolves.toHaveLength(1);
    await expect(links.list(otherTenant, 'ANOTA_AI', 'page-1')).resolves.toEqual([]);
  });

  it('rejects a product outside the tenant and supports explicit removal', async () => {
    try {
      await links.upsert({ ...link, tenantId: otherTenant }, { authoredBy: 'christian', at });
      throw new Error('Expected catalog product rejection.');
    } catch (error: unknown) {
      if (!(error instanceof ExternalCatalogLinkError)) throw error;
      expect(error.code).toBe('CATALOG_PRODUCT_NOT_FOUND');
    }

    await expect(links.remove(link)).resolves.toBe(true);
    await expect(links.remove(link)).resolves.toBe(false);
  });
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
