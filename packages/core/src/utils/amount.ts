/**
 * Truncates a number to N decimal places WITHOUT rounding.
 * Critical for CUFE/CUDE: DIAN requires truncation, not rounding.
 * Error CAD06/FAD06 = incorrect CUDE/CUFE due to rounding.
 *
 * @example truncateDecimals(100.456, 2) → "100.45"
 * @example truncateDecimals(99.999, 2)  → "99.99"
 */
export function truncateDecimals(value: number, decimals: number): string {
  const multiplier = 10 ** decimals;
  const truncated = Math.trunc(value * multiplier) / multiplier;
  return truncated.toFixed(decimals);
}

/**
 * Formats a monetary amount for XML output (2 decimal places, no thousands separator).
 * Uses truncation, not rounding.
 */
export function formatAmount(value: number): string {
  return truncateDecimals(value, 2);
}

/**
 * Formats a tax percentage for XML output (2 decimal places).
 */
export function formatPercent(value: number): string {
  return value.toFixed(2);
}

/**
 * Formats a date as YYYY-MM-DD (ISO 8601 date only).
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a time as HH:MM:SS-05:00 (Colombia timezone offset).
 * DIAN requires the timezone offset in the time string.
 */
export function formatTime(date: Date, utcOffset = "-05:00"): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${min}:${s}${utcOffset}`;
}
