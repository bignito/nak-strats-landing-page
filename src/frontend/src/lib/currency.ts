/**
 * Shared currency helpers.
 *
 * ALL USD dollar values across the app — storefront AND admin — must render
 * through formatPrice. Product prices, order totals, subtotals, tax, shipping,
 * revenue, average order value, minimum order total, and amountOwed are all
 * stored as Float US dollar decimals (e.g. 24.99). formatPrice renders the
 * dollar value directly with exactly two decimal places, so 24.99 shows as
 * "$24.99" rather than "$24.99" being divided by 100. There is NO cents
 * conversion anywhere in the display path.
 *
 * Token base units are a different unit and use their own formatters: ckUSDC
 * uses 6 decimals (1_000_000 base units = $1.00) and ICP uses 8 decimals
 * (e8s). These must NOT be divided by 100.
 */

/**
 * Format a Float US dollar amount as a USD string with exactly two decimal
 * places. The value is already in dollars (e.g. 24.99), so it is rendered
 * directly — never divided by 100.
 */
export function formatPrice(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a dollar string like "35.00" or "78.54" into a Float US dollar value
 * (e.g. 35 or 78.54). Returns null for invalid input or values with more than
 * two decimal places. The returned value is stored directly as dollars — no
 * cents conversion.
 */
export function parseDollars(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed);
}
