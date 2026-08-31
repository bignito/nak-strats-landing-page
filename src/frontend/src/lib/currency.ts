/**
 * Shared currency helpers for the storefront.
 *
 * Product prices are stored as integer cents. formatPrice divides by 100 and
 * always renders exactly two decimal places, so 3500 shows as "$35.00" rather
 * than "$35". Token amounts (ckUSDC/ICP) are a different unit and keep their
 * own formatter.
 */

/**
 * Format an integer cent amount as a USD string with exactly two decimal
 * places. Accepts either a bigint (backend prices) or a number (cart
 * arithmetic).
 */
export function formatPrice(value: bigint | number): string {
  const cents = Number(value);
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a dollar string like "35.00" or "78.54" into a whole number of cents.
 * Returns null for invalid input or values with more than two decimal places.
 */
export function dollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents;
}
