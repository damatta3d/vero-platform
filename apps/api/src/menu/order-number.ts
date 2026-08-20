export function formatOperationalOrderNumber(value: number | null | undefined): string | null {
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 99_999
  ) {
    return null;
  }
  return String(value).padStart(5, '0');
}
