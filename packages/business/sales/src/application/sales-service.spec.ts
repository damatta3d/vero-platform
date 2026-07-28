import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AuthorizedAccessContext
} from '@vero/core-access';
/* Test-only owner fixtures create the trusted security contexts exercised by this module. */
/* eslint-disable @nx/enforce-module-boundaries */
import { promoteVerifiedSubject } from '../../../../core/identity/src/internal/trusted-authentication.js';
import { requireTrustedAuthenticationResult } from '../../../../core/identity/src/application/authenticator.js';
import { createTenantIdFromTrustedValue } from '../../../../core/tenancy/src/domain/tenant-id.js';
import { createResolvedTenantContext } from '../../../../core/tenancy/src/application/resolved-tenant-context.js';
import type { SalesRepository } from './sales-repository.js';
import { SalesService } from './sales-service.js';

async function access(action: string): Promise<AuthorizedAccessContext> {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'christian', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return createAccessAuthorizer({
    evaluate: () =>
      Promise.resolve({
        outcome: 'allow',
        reason: 'test',
        policyRevision: '1'
      })
  }).authorize({
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue('santo-parma')),
    action: actionRef(action),
    resource: resourceRef('sales.management')
  });
}

describe(SalesService.name, () => {
  const emptySummary = {
    salesCount: 0,
    unitsSold: 0,
    grossRevenueCents: 0,
    estimatedCmvCents: 0,
    realizedCmvCents: 0,
    marginCents: 0,
    marginBasisPoints: 0
  };

  it('records through one repository transaction and returns the snapshot', async () => {
    const repository: SalesRepository = {
      transact: (_tenantId, _productId, _key, decide) =>
        Promise.resolve(
          decide({
            tenantId: 'santo-parma',
            productId: '10000000-0000-4000-8000-000000000001',
            productName: 'Parmegiana',
            recipeId: '20000000-0000-4000-8000-000000000001',
            recipeVersion: 1,
            yieldUnits: 1,
            unitSalePriceCents: 4490,
            recipeLines: [
              {
                ingredientId: '30000000-0000-4000-8000-000000000001',
                recipeQuantityMicros: 150_000,
                catalogUnitCostMicros: 5_300_000_000
              }
            ],
            stockPositions: [
              {
                tenantId: 'santo-parma',
                ingredientId: '30000000-0000-4000-8000-000000000001',
                quantityOnHandMicros: 1_000_000,
                averageUnitCostMicros: 5_000_000_000,
                inventoryValueCents: 5000
              }
            ]
          }).sale
        ),
      listSales: () => Promise.resolve([]),
      summarize: () => Promise.resolve(emptySummary)
    };
    let sequence = 0;
    const service = new SalesService(
      repository,
      { generate: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` },
      { now: () => new Date('2026-07-28T23:00:00.000Z') }
    );

    const sale = await service.recordSale(await access('sales.create'), {
      productId: '10000000-0000-4000-8000-000000000001',
      quantity: 1,
      idempotencyKey: '50000000-0000-4000-8000-000000000001'
    });

    expect(sale).toMatchObject({
      tenantId: 'santo-parma',
      grossRevenueCents: 4490,
      realizedCmvCents: 750
    });
  });

  it('rejects a context for another action', async () => {
    const repository = {
      transact: jest.fn(),
      listSales: jest.fn(),
      summarize: jest.fn()
    } as unknown as SalesRepository;
    const service = new SalesService(
      repository,
      { generate: () => '00000000-0000-4000-8000-000000000001' },
      { now: () => new Date() }
    );
    await expect(
      service.recordSale(await access('sales.read'), {
        productId: '10000000-0000-4000-8000-000000000001',
        quantity: 1,
        idempotencyKey: '50000000-0000-4000-8000-000000000001'
      })
    ).rejects.toThrow('not authorized');
  });

  it('lists sales with a bounded limit and returns the tenant summary', async () => {
    const listSales = jest.fn().mockResolvedValue([]);
    const summarize = jest.fn().mockResolvedValue(emptySummary);
    const repository = {
      transact: jest.fn(),
      listSales,
      summarize
    } as unknown as SalesRepository;
    const service = new SalesService(
      repository,
      { generate: () => '00000000-0000-4000-8000-000000000001' },
      { now: () => new Date() }
    );

    await expect(service.listSales(await access('sales.read'), 1000)).resolves.toEqual([]);
    await expect(service.summarize(await access('sales.read'))).resolves.toEqual(emptySummary);
    expect(listSales).toHaveBeenCalledWith('santo-parma', 100);
    expect(summarize).toHaveBeenCalledWith('santo-parma');
  });
});
