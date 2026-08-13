export type CheckoutPriceLine = {
  menuItemId: string;
  quantity: number;
  unitPriceCents: number;
};

export function calculateCheckoutTotal(lines: CheckoutPriceLine[]): number {
  return lines.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0);
}
