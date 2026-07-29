import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import type { SalesRepository } from './sales-repository.js';
import { completeSale, type Sale, type SalesSummary } from '../domain/sales-model.js';
import { SalesAuthorizationError } from '../domain/sales-errors.js';

export interface SalesIdGenerator {
  generate(): string;
}

export interface SalesClock {
  now(): Date;
}

export interface RecordSaleInput {
  readonly productId: string;
  readonly quantity: number;
  readonly idempotencyKey: string;
}

function salesAuthorization(
  context: AuthorizedAccessContext,
  expectedAction: string
): { tenantId: string; authoredBy: string } {
  const authorized = consumeAuthorizedAccess(context);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'sales.management'
  ) {
    throw new SalesAuthorizationError();
  }
  return {
    tenantId: authorized.request.tenant.tenantId.toString(),
    authoredBy: authorized.request.identity.principal.id.toString()
  };
}

export class SalesService {
  constructor(
    private readonly repository: SalesRepository,
    private readonly ids: SalesIdGenerator,
    private readonly clock: SalesClock
  ) {}

  async recordSale(access: AuthorizedAccessContext, input: RecordSaleInput): Promise<Sale> {
    const { tenantId, authoredBy } = salesAuthorization(access, 'sales.create');
    const saleId = this.ids.generate();
    const soldAt = this.clock.now();
    return this.repository.transact(
      tenantId,
      input.productId,
      input.idempotencyKey,
      (preparation) =>
        completeSale(preparation, {
          id: saleId,
          tenantId,
          idempotencyKey: input.idempotencyKey,
          quantity: input.quantity,
          movementIds: Object.fromEntries(
            preparation.recipeLines.map((line) => [line.ingredientId, this.ids.generate()])
          ),
          authoredBy,
          soldAt
        })
    );
  }

  async listSales(access: AuthorizedAccessContext, limit = 50): Promise<readonly Sale[]> {
    const { tenantId } = salesAuthorization(access, 'sales.read');
    return this.repository.listSales(tenantId, Math.min(Math.max(limit, 1), 100));
  }

  async summarize(access: AuthorizedAccessContext): Promise<SalesSummary> {
    const { tenantId } = salesAuthorization(access, 'sales.read');
    return this.repository.summarize(tenantId);
  }
}
