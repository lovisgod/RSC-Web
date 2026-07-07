export function orderStatusClass(status: string): string {
  return `order-status--${status.toLowerCase().replaceAll("_", "-")}`;
}
