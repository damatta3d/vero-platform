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
import type { ProductionRepository } from './production-repository.js';
import { ProductionService } from './production-service.js';

async function access(action: string): Promise<AuthorizedAccessContext> {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'christian', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return createAccessAuthorizer({
    evaluate: () => Promise.resolve({ outcome: 'allow', reason: 'test', policyRevision: '1' })
  }).authorize({
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue('santo-parma')),
    action: actionRef(action),
    resource: resourceRef('production.management')
  });
}

describe(ProductionService.name, () => {
  const emptySummary = {
    productionCount: 0,
    unitsProduced: 0,
    estimatedCmvCents: 0,
    realizedCmvCents: 0
  };

  it('records through one repository transaction and returns the production snapshot', async () => {
    const repository: ProductionRepository = {
      transact: (_tenantId, _productId, _key, decide) =>
        Promise.resolve(
          decide({
            tenantId: 'santo-parma',
            productId: '10000000-0000-4000-8000-000000000001',
            productName: 'Parmegiana',
            recipeId: '20000000-0000-4000-8000-000000000001',
            recipeVersion: 1,
            yieldUnits: 1,
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
          }).production
        ),
      listProduction: () => Promise.resolve([]),
      summarize: () => Promise.resolve(emptySummary)
    };
    let sequence = 0;
    const service = new ProductionService(
      repository,
      { generate: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` },
      { now: () => new Date('2026-07-28T23:30:00.000Z') }
    );

    const production = await service.recordProduction(await access('production.create'), {
      productId: '10000000-0000-4000-8000-000000000001',
      quantity: 1,
      idempotencyKey: '50000000-0000-4000-8000-000000000001'
    });

    expect(production).toMatchObject({
      tenantId: 'santo-parma',
      estimatedCmvCents: 795,
      realizedCmvCents: 750
    });
  });

  it('rejects another action and bounds read limits', async () => {
    const listProduction = jest.fn().mockResolvedValue([]);
    const summarize = jest.fn().mockResolvedValue(emptySummary);
    const repository = {
      transact: jest.fn(),
      listProduction,
      summarize
    } as unknown as ProductionRepository;
    const service = new ProductionService(
      repository,
      { generate: () => '00000000-0000-4000-8000-000000000001' },
      { now: () => new Date() }
    );

    await expect(
      service.recordProduction(await access('production.read'), {
        productId: '10000000-0000-4000-8000-000000000001',
        quantity: 1,
        idempotencyKey: '50000000-0000-4000-8000-000000000001'
      })
    ).rejects.toThrow('does not authorize');
    await expect(service.listProduction(await access('production.read'), 1000)).resolves.toEqual(
      []
    );
    await expect(service.summarize(await access('production.read'))).resolves.toEqual(emptySummary);
    expect(listProduction).toHaveBeenCalledWith('santo-parma', 100);
  });
});
