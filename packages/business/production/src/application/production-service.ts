import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import { ProductionAuthorizationError } from '../domain/production-errors.js';
import {
  completeProduction,
  type ProductionRecord,
  type ProductionSummary
} from '../domain/production-model.js';
import type { ProductionRepository } from './production-repository.js';

export interface ProductionIdGenerator {
  generate(): string;
}

export interface ProductionClock {
  now(): Date;
}

export interface RecordProductionInput {
  readonly productId: string;
  readonly quantity: number;
  readonly idempotencyKey: string;
}

function productionAuthorization(
  context: AuthorizedAccessContext,
  expectedAction: string
): { tenantId: string; authoredBy: string } {
  const authorized = consumeAuthorizedAccess(context);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'production.management'
  ) {
    throw new ProductionAuthorizationError();
  }
  return {
    tenantId: authorized.request.tenant.tenantId.toString(),
    authoredBy: authorized.request.identity.principal.id.toString()
  };
}

export class ProductionService {
  constructor(
    private readonly repository: ProductionRepository,
    private readonly ids: ProductionIdGenerator,
    private readonly clock: ProductionClock
  ) {}

  async recordProduction(
    access: AuthorizedAccessContext,
    input: RecordProductionInput
  ): Promise<ProductionRecord> {
    const { tenantId, authoredBy } = productionAuthorization(access, 'production.create');
    const productionId = this.ids.generate();
    const producedAt = this.clock.now();
    return this.repository.transact(
      tenantId,
      input.productId,
      input.idempotencyKey,
      (preparation) =>
        completeProduction(preparation, {
          id: productionId,
          tenantId,
          idempotencyKey: input.idempotencyKey,
          quantity: input.quantity,
          movementIds: Object.fromEntries(
            preparation.recipeLines.map((line) => [line.ingredientId, this.ids.generate()])
          ),
          authoredBy,
          producedAt
        })
    );
  }

  async listProduction(
    access: AuthorizedAccessContext,
    limit = 50
  ): Promise<readonly ProductionRecord[]> {
    const { tenantId } = productionAuthorization(access, 'production.read');
    return this.repository.listProduction(tenantId, Math.min(Math.max(limit, 1), 100));
  }

  async summarize(access: AuthorizedAccessContext): Promise<ProductionSummary> {
    const { tenantId } = productionAuthorization(access, 'production.read');
    return this.repository.summarize(tenantId);
  }
}
