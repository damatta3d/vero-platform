import type { Sale, SalePosting, SalePreparation, SalesSummary } from '../domain/sales-model.js';

export type SalePostingDecision = (preparation: SalePreparation) => SalePosting;

export interface SalesRepository {
  transact(
    tenantId: string,
    productId: string,
    idempotencyKey: string,
    decide: SalePostingDecision
  ): Promise<Sale>;
  listSales(tenantId: string, limit: number): Promise<readonly Sale[]>;
  summarize(tenantId: string): Promise<SalesSummary>;
}
