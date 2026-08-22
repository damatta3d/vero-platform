export type FulfillmentMode = 'DELIVERY' | 'PICKUP';

export type CheckoutCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export type CheckoutAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  stateCode: string;
  reference?: string;
};

export type CheckoutItem = {
  menuItemId: string;
  quantity: number;
  note?: string;
};

export type CheckoutDraft = {
  menuSlug: string;
  couponCode?: string;
  fulfillment: FulfillmentMode;
  customer: CheckoutCustomer;
  address: CheckoutAddress | null;
  orderNote?: string;
  items: CheckoutItem[];
};
