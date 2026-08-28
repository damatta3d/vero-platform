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
  createExternalCatalogLink,
  ExternalCatalogLinkError,
  resolveExternalOrderCatalog,
  type ExternalCatalogLink,
  type ExternalCatalogLinkErrorCode,
  type ExternalCatalogReferenceKind,
  type ExternalOrderCatalogResolution,
  type ResolvedExternalCatalogReference,
  type UnresolvedExternalCatalogReference
} from './application/external-catalog-link.js';
export {
  ExternalCatalogLinkService,
  type ExternalCatalogLinkAudit,
  type ExternalCatalogLinkClock,
  type ExternalCatalogLinkRepository,
  type ExternalCatalogLinkScope,
  type HomologateExternalCatalogLinkInput,
  type PersistedExternalCatalogLink,
  type RemoveExternalCatalogLinkInput
} from './application/external-catalog-link-service.js';
export {
  ExternalOrderInboxError,
  ExternalOrderInboxService,
  type ExternalOrderInboxClock,
  type ExternalOrderInboxErrorCode,
  type ExternalOrderInboxItem,
  type ExternalOrderInboxListQuery,
  type ExternalOrderInboxModifier,
  type ExternalOrderInboxPage,
  type ExternalOrderInboxRecord,
  type ExternalOrderInboxRepository,
  type ExternalOrderInboxSnapshot,
  type ExternalOrderMappingStatus,
  type ExternalOrderOperationalStatus,
  type ExternalOrderReceiveDisposition,
  type ExternalOrderReceiveResult,
  type PersistExternalOrderReceiptInput,
  type ReceiveExternalOrderInput
} from './application/external-order-inbox.js';
export type { SalePostingDecision, SalesRepository } from './application/sales-repository.js';
export {
  SalesService,
  type RecordSaleInput,
  type SalesClock,
  type SalesIdGenerator
} from './application/sales-service.js';
