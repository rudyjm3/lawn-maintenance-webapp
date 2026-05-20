/** Round a dollar amount to 2 decimal places. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/** Calculate tax amount given a subtotal and a percentage rate (e.g. 8.5 for 8.5%). */
export function calculateTax(subtotal: number, taxRatePercent: number): number {
  return roundCents(subtotal * (taxRatePercent / 100))
}
