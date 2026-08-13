import type { CheckoutDraft } from './checkout.types.js';

export function validateCheckoutDraft(draft: CheckoutDraft): string[] {
  const errors: string[] = [];
  if (!draft.customer?.name?.trim()) errors.push('customer.name');
  if (!draft.customer?.phone?.trim()) errors.push('customer.phone');
  if (!Array.isArray(draft.items) || draft.items.length === 0) errors.push('items');
  if (
    draft.items?.some(
      (item) => !item.menuItemId || !Number.isInteger(item.quantity) || item.quantity < 1
    )
  ) {
    errors.push('items.invalid');
  }
  if (draft.fulfillment === 'DELIVERY') {
    if (!draft.address?.street?.trim()) errors.push('address.street');
    if (!draft.address?.number?.trim()) errors.push('address.number');
    if (!draft.address?.district?.trim()) errors.push('address.district');
  }
  return errors;
}
