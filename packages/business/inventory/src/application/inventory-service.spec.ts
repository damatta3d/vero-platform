/* Test-only owner fixtures create the trusted security contexts exercised by this module. */
/* eslint-disable @nx/enforce-module-boundaries */
import { promoteVerifiedSubject } from '../../../../core/identity/src/internal/trusted-authentication.js';
import { requireTrustedAuthenticationResult } from '../../../../core/identity/src/application/authenticator.js';
import { createTenantIdFromTrustedValue } from '../../../../core/tenancy/src/domain/tenant-id.js';
import { createResolvedTenantContext } from '../../../../core/tenancy/src/application/resolved-tenant-context.js';
import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AuthorizedAccessContext
} from '@vero/core-access';
import {
  InventoryAuthorizationError,
  InventoryIngredientNotFoundError
} from '../domain/inventory-errors.js';
import {
  emptyStockPosition,
  type StockMovement,
  type StockPosition,
  type StockPosting
} from '../domain/inventory-model.js';
import type {
  InventoryIngredientCatalog,
  InventoryRepository,
  StockPostingDecision
} from './inventory-repository.js';
import { InventoryService } from './inventory-service.js';

class MemoryInventoryRepository implements InventoryRepository {
  readonly positions = new Map<string, StockPosition>();
  readonly movements: StockMovement[] = [];

  transact(
    tenantId: string,
    ingredientId: string,
    decide: StockPostingDecision
  ): Promise<StockPosting> {
    const key = `${tenantId}:${ingredientId}`;
    const posting = decide(this.positions.get(key) ?? emptyStockPosition(tenantId, ingredientId));
    this.positions.set(key, posting.position);
    this.movements.push(posting.movement);
    return Promise.resolve(posting);
  }

  findPosition(tenantId: string, ingredientId: string): Promise<StockPosition | undefined> {
    return Promise.resolve(this.positions.get(`${tenantId}:${ingredientId}`));
  }

  listPositions(tenantId: string): Promise<StockPosition[]> {
    return Promise.resolve(
      [...this.positions.values()].filter((position) => position.tenantId === tenantId)
    );
  }

  listMovements(tenantId: string, ingredientId: string, limit: number): Promise<StockMovement[]> {
    return Promise.resolve(
      this.movements
        .filter(
          (movement) => movement.tenantId === tenantId && movement.ingredientId === ingredientId
        )
        .slice(-limit)
        .reverse()
    );
  }
}

function trustedRequest(action: string, tenantId = 'santo-parma') {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'christian', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return {
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue(tenantId)),
    action: actionRef(action),
    resource: resourceRef('inventory.management')
  };
}

async function access(action: string, tenantId?: string): Promise<AuthorizedAccessContext> {
  return createAccessAuthorizer({
    evaluate: () =>
      Promise.resolve({ outcome: 'allow', reason: 'mvp-owner', policyRevision: 'mvp-v1' })
  }).authorize(trustedRequest(action, tenantId));
}

describe(InventoryService.name, () => {
  const now = new Date('2026-07-28T20:00:00.000Z');
  let sequence = 0;
  let repository: MemoryInventoryRepository;
  let catalog: InventoryIngredientCatalog;
  let service: InventoryService;

  beforeEach(() => {
    sequence = 0;
    repository = new MemoryInventoryRepository();
    catalog = {
      ingredientExists: (_tenantId, ingredientId) =>
        Promise.resolve(ingredientId === 'batata' || ingredientId === 'alcatra')
    };
    service = new InventoryService(
      repository,
      catalog,
      { generate: () => `movement-${++sequence}` },
      { now: () => now }
    );
  });

  it('records purchase, consumption and adjustment in an immutable tenant ledger', async () => {
    const purchase = await service.recordPurchase(await access('inventory.purchase.create'), {
      ingredientId: 'batata',
      quantityMicros: 25_000_000,
      totalCostCents: 10_000,
      reference: 'Compra CEASA 28/07'
    });
    const consumption = await service.recordConsumption(
      await access('inventory.consumption.create'),
      {
        ingredientId: 'batata',
        quantityMicros: 5_000_000,
        reason: 'Produção do dia'
      }
    );
    const adjustment = await service.recordAdjustment(await access('inventory.adjustment.create'), {
      ingredientId: 'batata',
      direction: 'IN',
      quantityMicros: 1_000_000,
      totalCostCents: 400,
      reason: 'Contagem física'
    });

    expect(purchase.position.quantityOnHandMicros).toBe(25_000_000);
    expect(consumption.movement.totalCostCents).toBe(2000);
    expect(adjustment.position.quantityOnHandMicros).toBe(21_000_000);
    expect(repository.movements).toHaveLength(3);
    await expect(
      service.listPositions(await access('inventory.position.read'))
    ).resolves.toHaveLength(1);
    await expect(
      service.listMovements(await access('inventory.movement.read'), 'batata')
    ).resolves.toHaveLength(3);
  });

  it('returns an empty position for a known ingredient without movements', async () => {
    await expect(
      service.getPosition(await access('inventory.position.read'), 'alcatra')
    ).resolves.toMatchObject({
      tenantId: 'santo-parma',
      ingredientId: 'alcatra',
      quantityOnHandMicros: 0
    });
  });

  it('rejects missing ingredients and an authorization for another action', async () => {
    await expect(
      service.recordPurchase(await access('inventory.purchase.create'), {
        ingredientId: 'missing',
        quantityMicros: 1,
        totalCostCents: 1,
        reference: 'Compra'
      })
    ).rejects.toThrow(InventoryIngredientNotFoundError);
    await expect(service.listPositions(await access('inventory.movement.read'))).rejects.toThrow(
      InventoryAuthorizationError
    );
    await expect(
      service.listMovements(await access('inventory.movement.read'), 'missing', 1000)
    ).rejects.toThrow(InventoryIngredientNotFoundError);
  });

  it('isolates stock positions by tenant', async () => {
    await service.recordPurchase(await access('inventory.purchase.create', 'tenant-a'), {
      ingredientId: 'batata',
      quantityMicros: 1_000_000,
      totalCostCents: 400,
      reference: 'Tenant A'
    });
    await service.recordPurchase(await access('inventory.purchase.create', 'tenant-b'), {
      ingredientId: 'batata',
      quantityMicros: 2_000_000,
      totalCostCents: 1000,
      reference: 'Tenant B'
    });

    await expect(
      service.listPositions(await access('inventory.position.read', 'tenant-a'))
    ).resolves.toEqual([
      expect.objectContaining({ tenantId: 'tenant-a', quantityOnHandMicros: 1_000_000 })
    ]);
  });
});
