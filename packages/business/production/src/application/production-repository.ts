import type {
  ProductionPosting,
  ProductionPreparation,
  ProductionRecord,
  ProductionSummary
} from '../domain/production-model.js';

export type ProductionPostingDecision = (preparation: ProductionPreparation) => ProductionPosting;

export interface ProductionRepository {
  transact(
    tenantId: string,
    productId: string,
    idempotencyKey: string,
    decide: ProductionPostingDecision
  ): Promise<ProductionRecord>;
  listProduction(tenantId: string, limit: number): Promise<readonly ProductionRecord[]>;
  summarize(tenantId: string): Promise<ProductionSummary>;
}
