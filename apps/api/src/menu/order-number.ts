export function orderNumber(orderId: string): string {
  const hex = orderId.replaceAll('-', '').slice(0, 8);
  const value = Number.parseInt(hex, 16);
  return String(Number.isFinite(value) ? value % 100_000 : 0).padStart(5, '0');
}
