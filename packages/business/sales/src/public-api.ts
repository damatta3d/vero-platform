export {
  InvalidSaleDataError,
  SaleProductNotFoundError,
  SalesAuthorizationError,
  SalesError
} from './domain/sales-errors.js';
export {
  completeSale,
  type CompleteSaleInput,
  type Sale,
  type SaleCostLine,
  type SalePosting,
  type SalePreparation,
  type SaleRecipeLineSnapshot,
  type SalesSummary
} from './domain/sales-model.js';
export type {
  ExternalOrder,
  ExternalOrderCustomer,
  ExternalOrderDeliveryAddress,
  ExternalOrderDiscount,
  ExternalOrderIdentity,
  ExternalOrderItem,
  ExternalOrderItemReference,
  ExternalOrderMerchant,
  ExternalOrderModifier,
  ExternalOrderPayment,
  ExternalOrderSource
} from './application/external-order.js';
export {
  ExternalCatalogLinkError,
  resolveExternalOrderCatalog,
  type ExternalCatalogLink,
  type ExternalCatalogLinkErrorCode,
  type ExternalCatalogReferenceKind,
  type ExternalOrderCatalogResolution,
  type ResolvedExternalCatalogReference,
  type UnresolvedExternalCatalogReference
} from './application/external-catalog-link.js';
export type { SalePostingDecision, SalesRepository } from './application/sales-repository.js';
export {
  SalesService,
  type RecordSaleInput,
  type SalesClock,
  type SalesIdGenerator
} from './application/sales-service.js';
