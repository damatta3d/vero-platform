export interface ExternalOrderIdentity {
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly orderExternalId: string;
  readonly idempotencyKey: string;
  readonly reference: string;
}

export interface ExternalOrderMerchant {
  readonly externalId: string;
  readonly name: string;
  readonly unit: string;
}

export interface ExternalOrderItemReference {
  readonly providerItemId: string;
  readonly externalId?: string;
  readonly internalId?: string;
  readonly backofficeId?: string;
}

export interface ExternalOrderModifier extends ExternalOrderItemReference {
  readonly parentProviderItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
}

export interface ExternalOrderItem extends ExternalOrderItemReference {
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly modifiers: readonly ExternalOrderModifier[];
}

export interface ExternalOrderDiscount {
  readonly amountCents: number;
  readonly tag: string;
}

export interface ExternalOrderPayment {
  readonly externalId?: string;
  readonly code: string;
  readonly name: string;
  readonly card: string;
  readonly prepaid: boolean;
  readonly changeForCents?: number;
  readonly amountCents: number;
}

export interface ExternalOrderCustomer {
  readonly name: string;
  readonly phone: string;
}

export interface ExternalOrderDeliveryAddress {
  readonly formattedAddress: string;
  readonly streetName: string;
  readonly streetNumber: string;
  readonly complement: string;
  readonly neighborhood: string;
  readonly city: string;
  readonly state: string;
  readonly country: string;
  readonly postalCode: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface ExternalOrderSource {
  readonly salesChannel: string;
  readonly origin: string;
  readonly type: string;
  readonly menuVersion: number;
}

export interface ExternalOrder {
  readonly currency: 'BRL';
  readonly identity: ExternalOrderIdentity;
  readonly merchant: ExternalOrderMerchant;
  readonly source: ExternalOrderSource;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly ExternalOrderItem[];
  readonly discounts: readonly ExternalOrderDiscount[];
  readonly deliveryFeeCents: number;
  readonly additionalFeesCents: readonly number[];
  readonly payments: readonly ExternalOrderPayment[];
  readonly totalCents: number;
  readonly customer: ExternalOrderCustomer;
  readonly deliveryAddress?: ExternalOrderDeliveryAddress;
}
