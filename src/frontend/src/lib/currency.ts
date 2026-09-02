/**
 * Shared currency helpers.
 *
 * ALL USD dollar values across the app — storefront AND admin — are stored as
 * integer cents (Nat / bigint). Product prices, order totals, subtotals, tax,
 * shipping, revenue, average order value, minimum order total, and amountOwed
 * are all integer cents (e.g. 6999 = $69.99). formatPrice renders cents as
 * dollars by dividing by 100, so 6999 shows as "$69.99". parseDollars converts
 * a dollar string like "48.00" back into integer cents (4800).
 *
 * Token base units are a different unit and use their own formatters: ckUSDC
 * uses 6 decimals (1_000_000 base units = $1.00) and ICP uses 8 decimals
 * (e8s). These must NOT be divided by 100.
 */

/**
 * Format an integer-cents amount (bigint or number) as a USD string with
 * exactly two decimal places. The value is integer cents (e.g. 6999), so it
 * is rendered as dollars by dividing by 100 — 6999 -> "$69.99".
 */
export function formatPrice(value: bigint | number): string {
  const cents = typeof value === "bigint" ? value : BigInt(Math.round(value));
  const dollars = cents / 100n;
  const remainder = cents % 100n;
  const centsPart = remainder.toString().padStart(2, "0");
  return `$${dollars.toString()}.${centsPart}`;
}

/**
 * Parse a dollar string like "48.00" or "78.54" into integer cents (e.g. 4800
 * or 7854). Returns null for empty input, values with more than two decimal
 * places, or any non-numeric value. The conversion is exact — it never rounds
 * or truncates to 0.
 */
export function parseDollars(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents;
}
